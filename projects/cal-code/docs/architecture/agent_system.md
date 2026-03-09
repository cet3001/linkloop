# Agent System Architecture

## Purpose

The Agent System coordinates specialized AI roles through LangGraph state machines to solve software development tasks reliably and incrementally.

## Agent Roles

- `planner_agent`: converts goals into executable plans and dependencies
- `builder_agent`: implements code and configuration changes
- `debugger_agent`: analyzes failures, traces root causes, and proposes fixes
- `research_agent`: gathers external technical knowledge through the Research System
- `architect_agent`: evaluates design trade-offs and long-horizon structure

## Execution Model

- A user request is normalized into a task objective.
- LangGraph creates a stateful execution graph with node-level responsibilities.
- Each node has:
  - required context
  - allowed tools
  - completion criteria
  - retry and escalation policy

## Shared Agent State

- Objective and constraints
- Active plan and remaining tasks
- Tool execution history
- Retrieved memory artifacts
- Validation outcomes and blockers

## Safety and Control

- Tools are permissioned per agent role.
- High-impact actions (destructive filesystem/git operations) require elevated confirmation policy.
- Graph checkpoints allow rollback/restart from stable states.

## Integration Points

- Uses `AI Core` for model inference.
- Uses `Planner` package for task decomposition.
- Uses `Context Engine` for prompt context assembly.
- Uses `Memory System` for long-term recall.
- Uses `Tools` for environment actions.
- Uses `Research System` when local context is insufficient.

## Extensibility

New agents can be added by defining:

- role contract
- allowed tools
- graph node implementation
- success/failure transitions
- evaluation rubric
