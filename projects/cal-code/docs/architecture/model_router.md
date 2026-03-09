# Model Router Architecture

## Purpose

Model Router selects the most appropriate Ollama model for each task, balancing quality, speed, and resource usage.

## Default Task Routing

- conversation -> `llama`
- coding -> `deepseek-coder`
- planning -> `qwen`

## Routing Inputs

- task category
- context size requirements
- latency target
- model availability on local machine
- current runtime load and memory pressure

## Routing Policy Layers

1. Static default map by task type.
2. Capability filter (supports code, planning, or general chat).
3. Resource-aware selection (GPU/CPU constraints).
4. Fallback chain when preferred model is unavailable.

## Fallback Example

- coding task:
  - primary: `deepseek-coder`
  - secondary: `qwen-coder`
  - tertiary: `llama`

## Observability

Record per request:

- selected model
- reason code (policy path)
- token and latency metrics
- success/failure status

These metrics are used to tune routing policy over time.
