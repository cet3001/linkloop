import os
import ollama
import threading
import queue
import json
import time
import uuid
import signal
import subprocess
import tempfile
import requests
import re
from datetime import datetime
from pathlib import Path

from playwright.sync_api import sync_playwright

from memory_store import (
    store_memory,
    retrieve_memory,
    get_user_profile,
    update_user_profile,
    get_user_goals,
    update_user_goals,
)

# =====================================================
# PATHS
# =====================================================
DATA_DIR = Path("./agent_state")
DATA_DIR.mkdir(exist_ok=True)

TASK_FILE = DATA_DIR / "task_queue.json"
LOG_FILE = DATA_DIR / "agent.log"

SANDBOX_ROOT = Path("./agent_workspace").resolve()
SANDBOX_ROOT.mkdir(exist_ok=True)

# =====================================================
# MODEL CONFIG  [FIX: was "llama3"]
# =====================================================
AVAILABLE_MODELS = {
    "fast": "qwen3:14b",
    "fast_small": "qwen3:8b",
    "coder": "qwen2.5-coder:32b-instruct-q4_K_M",
    "coder_fast": "qwen2.5-coder:7b-instruct",
}
CURRENT_MODEL_KEY = "fast"

# =====================================================
# AGENT ROLES
# =====================================================
AGENT_ROLES = {
    "default": "You are a helpful autonomous AI assistant.",
    "researcher": "You are a careful research analyst.",
    "coder": "You are a senior software engineer.",
    "operator": "You are a precise task execution specialist.",
    "trader": "You are a crypto trading specialist focused on DeFi and on-chain signals.",
    "coordinator": "You are a team coordinator managing agent workflows and accountability.",
    "marketer": "You are a digital marketing engine focused on content and growth.",
}

CURRENT_AGENT_ROLE = "default"


def get_role_prompt(role: str | None = None) -> str:
    key = role or CURRENT_AGENT_ROLE
    return AGENT_ROLES.get(key, AGENT_ROLES["default"])


# =====================================================
# LIMITS
# =====================================================
MAX_AGENT_STEPS = 4
MAX_BACKGROUND_TASKS_PER_CYCLE = 2
BACKGROUND_LOOP_INTERVAL = 30
# [FIX: was 8 — must be > browser timeout in seconds]
TOOL_TIMEOUT_SECONDS = 20

MAX_MEMORY_TOKENS = 900
CHARS_PER_TOKEN = 4
SUMMARY_TRIGGER_TURNS = 8

# =====================================================
# BROWSER SAFETY CONFIG
# [FIX: BROWSER_TIMEOUT_MS was 15000, now 12000 < TOOL_TIMEOUT_SECONDS*1000]
# =====================================================
BROWSER_TIMEOUT_MS = 12000
MAX_PAGE_TEXT = 8000

ALLOWED_DOMAINS: list[str] = []   # empty = allow all non-blocked
BLOCKED_DOMAINS: list[str] = ["localhost", "127.0.0.1", "::1", "0.0.0.0"]

# =====================================================
# STATE
# =====================================================
memory_queue: queue.Queue = queue.Queue()
task_queue: queue.Queue = queue.Queue()
shutdown_flag = False

# [FIX: per-agent buffers instead of single global list]
_agent_buffers: dict[str, list[str]] = {}
_agent_buffer_locks: dict[str, threading.Lock] = {}
_agent_buffers_meta = threading.Lock()


def _get_agent_buffer(agent_id: str) -> tuple[list[str], threading.Lock]:
    """Return (buffer, lock) for this agent, creating if needed."""
    with _agent_buffers_meta:
        if agent_id not in _agent_buffers:
            _agent_buffers[agent_id] = []
            _agent_buffer_locks[agent_id] = threading.Lock()
        return _agent_buffers[agent_id], _agent_buffer_locks[agent_id]


# =====================================================
# STRUCTURED LOGGING  [FIX: was plain text]
# =====================================================
_log_lock = threading.Lock()


def log_event(event: str, agent_id: str = "system", **kwargs):
    """Append one structured JSON line to the log."""
    record = {
        "ts": datetime.utcnow().isoformat() + "Z",
        "agent": agent_id,
        "event": event,
        **kwargs,
    }
    with _log_lock:
        with open(LOG_FILE, "a") as f:
            f.write(json.dumps(record) + "\n")


# =====================================================
# SAFE PATH
# =====================================================
def _safe_path(path_str: str) -> Path:
    p = (SANDBOX_ROOT / path_str).resolve()
    if not str(p).startswith(str(SANDBOX_ROOT)):
        raise ValueError("Path escapes sandbox")
    return p


# =====================================================
# FILESYSTEM TOOLS
# =====================================================
def tool_list_files(path: str = "."):
    try:
        p = _safe_path(path)
        if not p.exists():
            return {"error": "path not found"}
        return {"files": [f.name for f in p.iterdir()]}
    except Exception as e:
        return {"error": str(e)}


def tool_read_file(path: str):
    try:
        p = _safe_path(path)
        return {"content": p.read_text()[:5000]}
    except Exception as e:
        return {"error": str(e)}


def tool_write_file(path: str, content: str):
    try:
        p = _safe_path(path)
        p.parent.mkdir(parents=True, exist_ok=True)
        p.write_text(content)
        return {"status": "written"}
    except Exception as e:
        return {"error": str(e)}


# =====================================================
# HTTP WEB TOOL
# =====================================================
def tool_web_fetch(url: str):
    try:
        r = requests.get(url, timeout=8)
        return {"status": r.status_code, "content": r.text[:4000]}
    except Exception as e:
        return {"error": str(e)}


# =====================================================
# PLAYWRIGHT BROWSER TOOL
# =====================================================
def _domain_allowed(url: str) -> bool:
    """
    Check domain against block/allow lists.
    [FIX: strips port, handles IPv6 brackets [::1], handles malformed URLs safely]
    """
    try:
        # Strip scheme, grab host:port component
        host_port = re.sub(r"^https?://", "", url).split("/")[0].lower()

        # Handle IPv6 literal addresses: [::1] or [::1]:8080
        if host_port.startswith("["):
            domain = host_port.split("]")[0].lstrip("[")
        else:
            domain = host_port.split(":")[0]  # strip port for IPv4/hostname

        if not domain:
            return False  # malformed URL — deny

        if any(b in domain for b in BLOCKED_DOMAINS):
            return False

        if ALLOWED_DOMAINS:
            return any(a in domain for a in ALLOWED_DOMAINS)

        return True
    except Exception:
        return False


def tool_browser_fetch(url: str, screenshot: bool = False):
    """
    Playwright-backed browser fetch.
    [FIX: browser.close() in finally, domcontentloaded (faster), timeout aligned]
    """
    if not _domain_allowed(url):
        return {"error": "domain not allowed"}

    browser = None
    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            try:
                page = browser.new_page()
                page.goto(url, timeout=BROWSER_TIMEOUT_MS)
                # [FIX: domcontentloaded is faster and more reliable than networkidle]
                page.wait_for_load_state("domcontentloaded", timeout=BROWSER_TIMEOUT_MS)

                content = page.evaluate("() => document.body.innerText")

                result = {
                    "url": url,
                    "content": content[:MAX_PAGE_TEXT] if content else "",
                }

                if screenshot:
                    shot_path = SANDBOX_ROOT / f"shot_{int(time.time())}.png"
                    page.screenshot(path=str(shot_path))
                    result["screenshot"] = str(shot_path)

                log_event("browser_fetch", url=url, content_len=len(result["content"]))
                return result

            finally:
                # [FIX: always close browser even on page exception]
                browser.close()

    except Exception as e:
        log_event("browser_fetch_error", url=url, error=str(e))
        return {"error": str(e)}


# =====================================================
# PYTHON SANDBOX
# =====================================================
def tool_run_python(code: str):
    """[FIX: temp file now cleaned up in finally block]"""
    temp_path = None
    try:
        with tempfile.NamedTemporaryFile(mode="w", suffix=".py", delete=False) as f:
            f.write(code)
            temp_path = f.name

        result = subprocess.run(
            ["python", temp_path],
            capture_output=True,
            text=True,
            timeout=TOOL_TIMEOUT_SECONDS,
        )

        return {
            "stdout": result.stdout[:2000],
            "stderr": result.stderr[:2000],
            "returncode": result.returncode,
        }
    except Exception as e:
        return {"error": str(e)}
    finally:
        if temp_path:
            try:
                os.unlink(temp_path)
            except OSError:
                pass


# =====================================================
# BASIC TOOLS
# =====================================================
def tool_get_time():
    return {"time": datetime.now().isoformat()}


def tool_echo(text: str):
    return {"echo": text}


TOOLS = {
    "get_time": tool_get_time,
    "echo": tool_echo,
    "list_files": tool_list_files,
    "read_file": tool_read_file,
    "write_file": tool_write_file,
    "web_fetch": tool_web_fetch,
    "browser_fetch": tool_browser_fetch,
    "run_python": tool_run_python,
}


# =====================================================
# HELPERS
# =====================================================
def get_active_model():
    return AVAILABLE_MODELS[CURRENT_MODEL_KEY]


def estimate_tokens(text: str) -> int:
    return max(1, len(text) // CHARS_PER_TOKEN)


def build_memory_context(memories):
    selected = []
    used_tokens = 0
    for mem in memories:
        t = estimate_tokens(mem)
        if used_tokens + t > MAX_MEMORY_TOKENS:
            break
        selected.append(mem)
        used_tokens += t
    return "\n".join(selected) if selected else "None"


def enqueue_memory(text: str, metadata: dict):
    memory_queue.put({"text": text, "metadata": metadata})


# =====================================================
# TASK PERSISTENCE
# =====================================================
def save_tasks_to_disk():
    """[FIX: acquire queue mutex for safe snapshot]"""
    with task_queue.mutex:
        tasks = list(task_queue.queue)
    with open(TASK_FILE, "w") as f:
        json.dump(tasks, f)


def load_tasks_from_disk():
    if not TASK_FILE.exists():
        return
    try:
        tasks = json.loads(TASK_FILE.read_text())
        for t in tasks:
            task_queue.put(t)
        log_event("tasks_loaded", count=len(tasks))
    except Exception as e:
        log_event("task_load_failed", error=str(e))


def create_task(description: str, priority: int = 1):
    task = {
        "id": str(uuid.uuid4()),
        "description": description,
        "priority": priority,
        "created_at": datetime.utcnow().isoformat(),
    }
    task_queue.put(task)
    save_tasks_to_disk()


# =====================================================
# MEMORY WORKER
# =====================================================
def memory_worker():
    while not shutdown_flag:
        try:
            item = memory_queue.get(timeout=1)
        except queue.Empty:
            continue

        try:
            meta = item.get("metadata", {}) or {}
            ok = store_memory(
                text=item["text"],
                metadata=meta,
                agent_id=meta.get("agent_id"),
                shared=meta.get("shared", False),
            )
            if not ok:
                log_event("memory_store_failed", agent_id=meta.get("agent_id", "unknown"))
        except Exception as e:
            log_event("memory_worker_error", error=str(e))
        finally:
            memory_queue.task_done()


# =====================================================
# SAFE TOOL EXECUTION
# =====================================================
def execute_tool_safe(action, args, agent_id: str = "system"):
    if action not in TOOLS:
        return {"error": f"Unknown tool: {action}"}

    result_holder: dict = {}

    def runner():
        try:
            result_holder["result"] = TOOLS[action](**args)
        except Exception as e:
            result_holder["result"] = {"error": str(e)}

    t0 = time.monotonic()
    t = threading.Thread(target=runner, daemon=True)
    t.start()
    t.join(timeout=TOOL_TIMEOUT_SECONDS)
    duration_ms = int((time.monotonic() - t0) * 1000)

    if t.is_alive():
        log_event("tool_timeout", agent_id=agent_id, tool=action, duration_ms=duration_ms)
        return {"error": "tool timeout"}

    log_event("tool_call", agent_id=agent_id, tool=action, duration_ms=duration_ms)
    return result_holder.get("result", {"error": "no result"})


# =====================================================
# REACT PLANNER
# =====================================================
REACT_SCHEMA = """
You are a reasoning agent.

When using tools, output STRICT JSON:

{
  "action": "tool_name",
  "arguments": { ... }
}

When finished:

{
  "final": "answer"
}
"""


def run_agent_loop(user_input: str, system_prompt: str, agent_id: str = "system"):
    model = get_active_model()
    scratchpad = ""

    for step in range(MAX_AGENT_STEPS):
        response = ollama.chat(
            model=model,
            messages=[
                {"role": "system", "content": system_prompt + "\n\n" + REACT_SCHEMA},
                {"role": "user", "content": user_input + "\n\n" + scratchpad},
            ],
        )

        raw_output = response["message"]["content"].strip()

        json_start = raw_output.find("{")
        json_end = raw_output.rfind("}")

        parsed = None
        if json_start != -1 and json_end != -1 and json_end > json_start:
            try:
                parsed = json.loads(raw_output[json_start : json_end + 1])
            except Exception:
                parsed = None

        if isinstance(parsed, dict) and "final" in parsed:
            log_event("agent_loop_done", agent_id=agent_id, steps=step + 1)
            return parsed["final"]

        if isinstance(parsed, dict) and "action" in parsed:
            result = execute_tool_safe(
                parsed.get("action"),
                parsed.get("arguments", {}),
                agent_id=agent_id,
            )
            scratchpad += f"\nObservation: {json.dumps(result)}\n"
            continue

        return raw_output

    log_event("step_limit_reached", agent_id=agent_id)
    return "Step limit reached."


# =====================================================
# BACKGROUND AGENT
# =====================================================
def background_agent_loop():
    while not shutdown_flag:
        try:
            goals = get_user_goals()  # global goals intentional for shared task queue

            if goals and task_queue.qsize() < 3:
                create_task(
                    f"Review progress toward goals: {goals[:120]}",
                    priority=1,
                )

            processed = 0

            while (
                not task_queue.empty()
                and processed < MAX_BACKGROUND_TASKS_PER_CYCLE
            ):
                task = task_queue.get()
                try:
                    role_prompt = get_role_prompt()

                    system_prompt = f"""
{role_prompt}

You are an autonomous background agent.

User goals:
{goals}

Complete the task concisely.
"""
                    t0 = time.monotonic()
                    result = run_agent_loop(
                        task["description"], system_prompt, agent_id="background"
                    )
                    duration_ms = int((time.monotonic() - t0) * 1000)

                    enqueue_memory(
                        f"Background task completed: {task['description']} → {result}",
                        {"type": "background_task", "shared": True},
                    )
                    log_event(
                        "bg_task_done",
                        agent_id="background",
                        task_id=task.get("id", "?"),
                        duration_ms=duration_ms,
                    )
                    processed += 1
                finally:
                    # [FIX: task_done() was missing]
                    task_queue.task_done()

            save_tasks_to_disk()

        except Exception as e:
            log_event("background_error", error=str(e))

        time.sleep(BACKGROUND_LOOP_INTERVAL)


# =====================================================
# SUMMARIES
# =====================================================
def summarize_conversation(buffer_text: str) -> str:
    model = get_active_model()
    prompt = f"""Summarize the following conversation into durable long-term facts.

Conversation:
{buffer_text}
"""
    r = ollama.chat(model=model, messages=[{"role": "user", "content": prompt}])
    return r["message"]["content"]


def extract_goals(buffer_text: str) -> str:
    """[FIX: buffer_text was never inserted into prompt]"""
    model = get_active_model()
    prompt = f"""Extract the user's ACTIVE GOALS from this conversation.
Return a concise bullet list.

Conversation:
{buffer_text}
"""
    r = ollama.chat(model=model, messages=[{"role": "user", "content": prompt}])
    return r["message"]["content"]


# =====================================================
# MAIN CHAT (agent-aware)
# =====================================================
def chat(
    user_input: str,
    agent_id: str = "default",
    use_shared_memory: bool = True,
    role: str | None = None,
):
    """
    Primary entry point. Supports per-agent memory, profile, goals, and role.
    [FIX: per-agent buffer, agent_id passed to profile/goals, summarization restored]
    """
    memories = retrieve_memory(
        user_input,
        k=12,
        agent_id=agent_id,
        include_shared=use_shared_memory,
    )

    memory_context = build_memory_context(memories)
    # [FIX: pass agent_id so each agent reads its own profile/goals file]
    profile = get_user_profile(agent_id=agent_id) or "None"
    goals = get_user_goals(agent_id=agent_id) or "None"
    role_prompt = get_role_prompt(role)

    system_prompt = f"""
{role_prompt}

User profile:
{profile}

Active user goals:
{goals}

Relevant memories:
{memory_context}

Be helpful and goal-aware.
Do not mention the memory system.
"""

    t0 = time.monotonic()
    answer = run_agent_loop(user_input, system_prompt, agent_id=agent_id)
    log_event("chat", agent_id=agent_id, duration_ms=int((time.monotonic() - t0) * 1000))

    enqueue_memory(
        f"User: {user_input}",
        {"type": "user", "agent_id": agent_id},
    )
    enqueue_memory(
        f"Assistant: {answer}",
        {"type": "assistant", "agent_id": agent_id},
    )

    # [FIX: per-agent buffer with lock, summarization restored]
    buf, lock = _get_agent_buffer(agent_id)
    with lock:
        buf.append(f"User: {user_input}")
        buf.append(f"Assistant: {answer}")
        should_consolidate = len(buf) >= SUMMARY_TRIGGER_TURNS
        if should_consolidate:
            buffer_snapshot = "\n".join(buf)
            buf.clear()

    if should_consolidate:
        try:
            summary = summarize_conversation(buffer_snapshot)
            goals_text = extract_goals(buffer_snapshot)
            enqueue_memory(
                f"Conversation summary: {summary}",
                {"type": "summary", "shared": True},
            )
            update_user_profile(summary, agent_id=agent_id)
            update_user_goals(goals_text, agent_id=agent_id)
            log_event("consolidation_done", agent_id=agent_id)
        except Exception as e:
            log_event("consolidation_error", agent_id=agent_id, error=str(e))

    return answer


# =====================================================
# RUNTIME INIT  [FIX: no longer runs at import time]
# =====================================================
def start_runtime():
    """
    Start background workers and load persisted state.
    Call this explicitly — from __main__ or from openclaw_adapter.
    NOT called at import time so library imports are safe.
    """
    load_tasks_from_disk()
    threading.Thread(target=memory_worker, daemon=True, name="mem-worker").start()
    threading.Thread(target=background_agent_loop, daemon=True, name="bg-agent").start()
    log_event("runtime_started")


# =====================================================
# SHUTDOWN
# =====================================================
def handle_shutdown(sig=None, frame=None):
    global shutdown_flag
    shutdown_flag = True
    save_tasks_to_disk()
    print("\nAgent shutting down cleanly.")
    raise SystemExit(0)


signal.signal(signal.SIGINT, handle_shutdown)


# =====================================================
# ENTRY POINT (direct script usage)
# =====================================================
if __name__ == "__main__":
    start_runtime()
    print(f"Autonomous agent ready. Model: {get_active_model()}\n")

    while True:
        user = input("You: ")
        if user.lower() in ["exit", "quit"]:
            handle_shutdown()
        reply = chat(user, agent_id="default")
        print(f"\nAI: {reply}\n")
