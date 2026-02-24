"""
openclaw_adapter.py — Thin OpenClaw → Runtime Integration Layer

Maps OpenClaw agent IDs to their chat/task functions.
Minimal surface area. No frameworks. Local-only.

Public API (the only things OpenClaw needs to call):

    agent_chat(agent_id, message)            → str
    agent_create_task(agent_id, description) → None
    shutdown()                               → None
    runtime_status()                         → dict

Wiring example in OpenClaw orchestrator:

    from openclaw_adapter import agent_chat, shutdown
    import atexit

    atexit.register(shutdown)

    # Route a message to Tiana
    reply = agent_chat("tiana", "Find the top 3 crypto opportunities today")

    # Queue a background task for Lamar
    from openclaw_adapter import agent_create_task
    agent_create_task("lamar", "Monitor Base chain wallet for new signals")
"""

import threading
from chat_with_memory import (
    chat,
    create_task,
    save_tasks_to_disk,
    start_runtime,
    log_event,
)

# =====================================================
# AGENT CONFIG MAP
# Defines role + shared-memory preference per agent.
# Role must match a key in AGENT_ROLES in chat_with_memory.py
# =====================================================
AGENT_CONFIGS: dict[str, dict] = {
    "tyrell":   {"role": "coder",      "use_shared_memory": True},
    "tiana":    {"role": "researcher", "use_shared_memory": True},
    "lamar":    {"role": "operator",   "use_shared_memory": True},
    "latishia": {"role": "default",    "use_shared_memory": True},
}

_started = False
_start_lock = threading.Lock()


# =====================================================
# LIFECYCLE
# =====================================================
def _ensure_started():
    """Lazy-start the runtime on first use (idempotent, thread-safe)."""
    global _started
    if not _started:
        with _start_lock:
            if not _started:
                start_runtime()
                _started = True


def shutdown():
    """Cleanly flush tasks to disk. Register with atexit in OpenClaw."""
    save_tasks_to_disk()
    log_event("adapter_shutdown")


# =====================================================
# PRIMARY ENTRY POINTS
# =====================================================
def agent_chat(
    agent_id: str,
    message: str,
    use_shared_memory: bool | None = None,
) -> str:
    """
    Route a message to the correct agent.
    Looks up role and shared-memory preference from AGENT_CONFIGS.
    Falls back gracefully for unknown agent_ids.
    """
    _ensure_started()

    config = AGENT_CONFIGS.get(agent_id, {"role": "default", "use_shared_memory": True})
    role = config["role"]
    shared = use_shared_memory if use_shared_memory is not None else config["use_shared_memory"]

    return chat(
        user_input=message,
        agent_id=agent_id,
        use_shared_memory=shared,
        role=role,
    )


def agent_create_task(agent_id: str, description: str, priority: int = 1):
    """
    Enqueue a background task for the global task queue.
    Task queue is shared — prefix with agent_id for background loop context.
    """
    _ensure_started()
    prefixed = f"[{agent_id}] {description}"
    create_task(prefixed, priority=priority)
    log_event("task_enqueued", agent_id=agent_id, description=description[:80])


# =====================================================
# HEALTH / OBSERVABILITY
# =====================================================
def runtime_status() -> dict:
    """Returns queue depths and buffer counts for monitoring."""
    from chat_with_memory import memory_queue, task_queue, _agent_buffers
    return {
        "started": _started,
        "memory_queue_depth": memory_queue.qsize(),
        "task_queue_depth": task_queue.qsize(),
        "agent_buffer_counts": {
            agent_id: len(buf) for agent_id, buf in _agent_buffers.items()
        },
        "configured_agents": list(AGENT_CONFIGS.keys()),
    }
