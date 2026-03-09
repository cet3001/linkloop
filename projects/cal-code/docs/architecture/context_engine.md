# Context Engine Architecture

## Purpose

Context Engine assembles relevant, compact, and high-signal context for planner and agent inference.

## Primary Context Sources

- open files
- repository snapshot
- git history and diff signals
- terminal output and command outcomes

## Context Pipeline

1. Collect signals from local providers.
2. Normalize into a shared context schema.
3. Rank and deduplicate snippets by relevance.
4. Enforce token budget with priority tiers.
5. Emit task-specific context packet for AI Core.

## Context Priority Tiers

- Tier 1: active file + immediate edits
- Tier 2: related symbols/modules
- Tier 3: recent git changes and terminal diagnostics
- Tier 4: long-term memory retrieval from Memory System

## Guardrails

- Respect local privacy boundaries by default.
- Exclude sensitive file patterns unless explicitly allowed.
- Mark low-confidence context so agents can verify before acting.

## Integration Points

- Consumes local IDE, git, and terminal adapters.
- Queries Memory System for semantic recall.
- Feeds Planner and Agents through standardized context contracts.
