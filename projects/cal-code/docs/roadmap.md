# Cal Code Development Roadmap

## Phase 1: IDE Foundation

- Build desktop shell with Tauri.
- Implement frontend shell with React + Tailwind.
- Integrate Monaco editor and base workspace panels.
- Add initial AI chat interface and local session state.

## Phase 2: AI Runtime and Routing

- Integrate Ollama client into AI Core.
- Define model catalog and capability metadata.
- Implement Model Router with task-based defaults.
- Add routing telemetry and fallback handling.

## Phase 3: Agent System

- Implement LangGraph runtime and shared agent state.
- Add `planner_agent`, `builder_agent`, `debugger_agent`, `research_agent`, and `architect_agent`.
- Wire tool permissions and execution checkpoints.
- Introduce validation loop for agent outputs.

## Phase 4: Memory System

- Stand up Qdrant collections for memory domains.
- Build LlamaIndex ingestion and retrieval pipelines.
- Add repository and document indexing jobs.
- Enable conversation memory recall in agent flows.

## Phase 5: Research Agent

- Integrate Firecrawl for web and documentation scraping.
- Build ingestion pipeline into Memory System.
- Add source attribution and confidence scoring.
- Expose research workflows to `research_agent`.

## Phase 6: Autonomous Builder

- Implement idea-to-plan-to-execution pipeline.
- Add guarded autonomous loops with checkpoints.
- Improve multi-agent collaboration and retry logic.
- Deliver plugin-enabled mode packs for specialized development workflows.

## Cross-Phase Engineering Standards

- Local-first default operation with explicit opt-in for remote services.
- Clean module boundaries and shared contracts across systems.
- Testability and observability built into each subsystem increment.
