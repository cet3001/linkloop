# Memory System Architecture

## Purpose

The Memory System provides durable, queryable project intelligence for coding sessions, enabling recall beyond the current prompt window.

## Technology Choices

- Vector store: Qdrant
- Indexing and retrieval framework: LlamaIndex

## Memory Domains

- `document_index`: technical docs, READMEs, architecture notes
- `repository_index`: source files, symbols, dependency references
- `conversation_memory`: prior AI interactions, decisions, and outcomes

## Data Flow

1. New artifacts are captured from editor, tools, and research pipelines.
2. LlamaIndex transforms content into chunked, metadata-rich nodes.
3. Embeddings are written into Qdrant collections.
4. Retrieval queries return relevant nodes for active agent tasks.
5. Retrieved context is ranked and sent to AI Core for inference.

## Metadata Contract

Each memory record should include:

- source type (repo, docs, conversation, research)
- workspace path or URL origin
- timestamp and version/hash
- relevance tags (component, language, subsystem)
- confidence/quality markers

## Retention Strategy

- Keep high-signal architectural and decision records long-term.
- Apply TTL or archival policy to transient terminal/session noise.
- Re-index on significant repository change events.

## Integration Points

- Ingests content from Context Engine and Research System.
- Serves retrieval requests to Agents and Planner.
- Optionally powers plugin-specific memory namespaces.
