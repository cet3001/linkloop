import os
import chromadb
from chromadb.config import Settings
import threading
from pathlib import Path
import uuid

# Suppress Chroma's PostHog/OpenTelemetry telemetry threads at import time
os.environ.setdefault("ANONYMIZED_TELEMETRY", "False")
os.environ.setdefault("CHROMA_ANONYMIZED_TELEMETRY", "False")

# =====================================================
# PATHS
# =====================================================
DATA_DIR = Path("./agent_state")
DATA_DIR.mkdir(exist_ok=True)

# =====================================================
# NAMESPACE CONFIG
# =====================================================
DEFAULT_AGENT_ID = "default"
SHARED_NAMESPACE = "shared"

def _agent_namespace(agent_id: str | None) -> str:
    if not agent_id:
        agent_id = DEFAULT_AGENT_ID
    # Sanitize: strip colons to prevent namespace injection
    agent_id = agent_id.replace(":", "_")
    return f"agent:{agent_id}"

# =====================================================
# CHROMA SETUP (hardened: PersistentClient API)
# =====================================================
_chroma_client = chromadb.PersistentClient(
    path=str(DATA_DIR / "chroma"),
    settings=Settings(anonymized_telemetry=False),
)
long_term = _chroma_client.get_or_create_collection(name="long_term_memory")

# =====================================================
# EMBEDDING MODEL (lazy-loaded, thread-safe)
# =====================================================
_embed_model = None
_embed_lock = threading.Lock()

def _get_embed_model():
    global _embed_model
    if _embed_model is None:
        with _embed_lock:
            if _embed_model is None:
                from sentence_transformers import SentenceTransformer
                _embed_model = SentenceTransformer("BAAI/bge-small-en-v1.5")
    return _embed_model

def embed_text(text: str) -> list[float]:
    return _get_embed_model().encode(text).tolist()

# =====================================================
# STORE MEMORY (NAMESPACED, error-bounded)
# =====================================================
def store_memory(
    text: str,
    metadata: dict | None = None,
    agent_id: str | None = None,
    shared: bool = False,
) -> bool:
    """Store a memory. Returns True on success, False on failure (never raises)."""
    try:
        metadata = dict(metadata or {})
        namespace = SHARED_NAMESPACE if shared else _agent_namespace(agent_id)
        metadata["namespace"] = namespace
        embedding = embed_text(text)
        long_term.add(
            ids=[str(uuid.uuid4())],
            documents=[text],
            embeddings=[embedding],
            metadatas=[metadata],
        )
        return True
    except Exception:
        return False

# =====================================================
# RETRIEVE MEMORY (FILTERED, $or with fallback)
# =====================================================
def retrieve_memory(
    query: str,
    k: int = 5,
    agent_id: str | None = None,
    include_shared: bool = True,
) -> list[str]:
    """Retrieve relevant memories. Returns empty list on failure."""
    try:
        embedding = embed_text(query)
        agent_ns = _agent_namespace(agent_id)

        if include_shared and agent_ns != f"agent:{SHARED_NAMESPACE}":
            try:
                # Attempt $or filter (supported in Chroma 0.4+)
                where_filter = {
                    "$or": [
                        {"namespace": {"$eq": agent_ns}},
                        {"namespace": {"$eq": SHARED_NAMESPACE}},
                    ]
                }
                results = long_term.query(
                    query_embeddings=[embedding],
                    n_results=k,
                    where=where_filter,
                    include=["documents", "metadatas"],
                )
            except Exception:
                # Fallback: two separate queries, merge results
                r1 = long_term.query(
                    query_embeddings=[embedding],
                    n_results=k,
                    where={"namespace": {"$eq": agent_ns}},
                    include=["documents"],
                )
                r2 = long_term.query(
                    query_embeddings=[embedding],
                    n_results=k,
                    where={"namespace": {"$eq": SHARED_NAMESPACE}},
                    include=["documents"],
                )
                d1 = r1.get("documents", [[]])[0] or []
                d2 = r2.get("documents", [[]])[0] or []
                combined = list(dict.fromkeys(d1 + d2))  # dedupe, preserve order
                return combined[:k]
        else:
            results = long_term.query(
                query_embeddings=[embedding],
                n_results=k,
                where={"namespace": {"$eq": agent_ns}},
                include=["documents", "metadatas"],
            )

        docs = results.get("documents", [[]])
        return docs[0] if docs and docs[0] else []
    except Exception:
        return []

# =====================================================
# USER PROFILE / GOALS (per-agent scoped + write lock)
# =====================================================
_file_locks: dict[str, threading.Lock] = {}
_file_locks_meta = threading.Lock()

def _get_file_lock(path: Path) -> threading.Lock:
    key = str(path)
    with _file_locks_meta:
        if key not in _file_locks:
            _file_locks[key] = threading.Lock()
        return _file_locks[key]

def _profile_path(agent_id: str | None = None) -> Path:
    if not agent_id or agent_id == DEFAULT_AGENT_ID:
        return DATA_DIR / "user_profile.txt"
    return DATA_DIR / f"profile_{agent_id}.txt"

def _goals_path(agent_id: str | None = None) -> Path:
    if not agent_id or agent_id == DEFAULT_AGENT_ID:
        return DATA_DIR / "user_goals.txt"
    return DATA_DIR / f"goals_{agent_id}.txt"

def get_user_profile(agent_id: str | None = None) -> str:
    p = _profile_path(agent_id)
    with _get_file_lock(p):
        return p.read_text() if p.exists() else ""

def update_user_profile(text: str, agent_id: str | None = None):
    p = _profile_path(agent_id)
    with _get_file_lock(p):
        p.write_text(text)

def get_user_goals(agent_id: str | None = None) -> str:
    p = _goals_path(agent_id)
    with _get_file_lock(p):
        return p.read_text() if p.exists() else ""

def update_user_goals(text: str, agent_id: str | None = None):
    p = _goals_path(agent_id)
    with _get_file_lock(p):
        p.write_text(text)
