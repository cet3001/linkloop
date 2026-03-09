# Cal Code System Overview

## Mission

Cal Code is a local-first AI IDE that prioritizes private, offline-capable development workflows. Cloud providers are optional extensions, not default dependencies.

## Core Stack

- Desktop shell: Tauri
- Frontend: React + Tailwind + Monaco Editor
- Model runtime: Ollama
- Agent orchestration: LangGraph
- Memory: Qdrant + LlamaIndex
- Tool execution: Open Interpreter-inspired local tool layer
- Research ingestion: Firecrawl

## High-Level Architecture

1. User interacts with Monaco editor + AI chat in the desktop frontend.
2. Context Engine assembles local context (files, repository signals, terminal output).
3. Planner converts user intent into a task graph.
4. Agent System executes graph nodes using specialized agents.
5. AI Core routes each task to an Ollama model using Model Router policies.
6. Tool layer performs local actions (filesystem, terminal, git, package managers).
7. Memory System indexes artifacts and stores long-term memory in Qdrant.
8. Research System augments local context using Firecrawl when external knowledge is needed.

## System Boundaries

- `apps/desktop`: user-facing IDE shell and UI
- `apps/ai-core`: model runtime + inference contract
- `apps/agents`: multi-agent workflows and execution lifecycle
- `apps/memory`: indexing, retrieval, and memory persistence
- `apps/research`: web/document crawling and ingestion workflows
- `apps/tools`: controlled execution of local development tools
- `apps/plugins`: extension API and plugin lifecycle
- `packages/*`: shared business logic reused by applications

## Local-First Guarantees

- Ollama is the primary model runtime.
- Core workflows execute fully on local machine.
- External APIs must be opt-in and routed behind explicit configuration.
- Context capture defaults to local sources before web retrieval.

## Initial Non-Goals

- No mandatory cloud model providers.
- No autonomous internet actions without explicit policy controls.
- No full feature parity with existing IDEs at bootstrap.
