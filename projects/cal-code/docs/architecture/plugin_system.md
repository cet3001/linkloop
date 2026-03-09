# Plugin System Architecture

## Purpose

The Plugin System enables mode-specific development experiences without changing core Cal Code systems.

## Initial Plugin Types

- `web_app_plugin`
- `mobile_app_plugin`
- `saas_builder_plugin`
- `design_system_plugin`

## Plugin Responsibilities

- contribute templates and scaffolding policies
- register mode-aware prompts and workflows
- provide additional tools or constraints
- add domain-specific context enrichers

## Plugin Runtime Model

- Plugins declare capabilities through a manifest.
- Core systems expose stable extension points:
  - planner hooks
  - agent hook middleware
  - context providers
  - tool policies
- Plugin lifecycle:
  - discover
  - validate
  - initialize
  - activate/deactivate

## Isolation and Safety

- Plugins operate under least-privilege permissions.
- Tool access is scoped by declared capability.
- Invalid plugins fail closed and do not block core startup.

## Versioning Strategy

- Semantic versioning per plugin.
- Compatibility matrix against Cal Code core API versions.
- Migration hooks for plugin schema changes.
