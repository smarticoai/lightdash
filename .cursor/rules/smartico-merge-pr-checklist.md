# Smartico Merge PR Checklist

Use this checklist in PR descriptions for upstream merge/rebase work.

## Scope

- [ ] Upstream base branch and commit are documented.
- [ ] Smartico-specific changes are listed by area (auth, UI, BQ override, cache, AI tabs, runtime/build).
- [ ] Risky files touched in this PR are listed explicitly.

## Contracts and Types

- [ ] `common` contracts and backend entities/models are aligned.
- [ ] Typechecks pass for touched packages.
- [ ] No schema/type drift for Smartico fields (`smartico_*`, query history custom fields, etc).

## Auth and Transport

- [ ] Embedded frontend sends Smartico token in `jwt` header.
- [ ] Backend accepts Smartico JWT flow.
- [ ] PAT / ApiKey flow still works.
- [ ] No auth strategy registration collisions.

## Query Paths (Critical)

- [ ] `bq_project_id` rewrite is applied in `ProjectService` paths.
- [ ] `bq_project_id` rewrite is applied in `AsyncQueryService` paths.
- [ ] `/api/v2/.../query/field-values` returns expected values on BigQuery projects.
- [ ] Currency/token placeholder substitutions still work in expected responses.

## Dashboard and Frontend Runtime

- [ ] Dashboard loads without runtime reference errors.
- [ ] Tab modal save flow persists `smarticoEnableAiAnalysis` and `smarticoAiAnalysisPrompt`.
- [ ] AI stream reads latest tab prompt version.
- [ ] Chart/table parity checked for temporal dimensions.
- [ ] Temporal chart sanity checked:
  - [ ] stacked bar
  - [ ] stacked area
  - [ ] mixed bar+line

## Optional EE Service Guardrails

- [ ] Missing optional EE services fail gracefully (no unhandled `MissingConfigError` in normal routes).
- [ ] CE-compatible behavior verified where applicable.

## Build and Migration

- [ ] Backend build succeeds.
- [ ] Frontend build succeeds.
- [ ] Required package artifacts are present (no missing generated runtime files).
- [ ] DB migration strategy and environment scope are documented (dev/prod boundaries).

## Validation Evidence

- [ ] Commands run are listed (typecheck/tests/build).
- [ ] Manual verification notes are included for Smartico invariants.
- [ ] Remaining known risks and follow-ups are listed.

# Smartico Merge PR Checklist

Use this checklist in PR descriptions for upstream merge/rebase work.

## Scope

- [ ] Upstream base branch and commit are documented.
- [ ] Smartico-specific changes are listed by area (auth, UI, BQ override, cache, AI tabs, runtime/build).
- [ ] Risky files touched in this PR are listed explicitly.

## Contracts and Types

- [ ] `common` contracts and backend entities/models are aligned.
- [ ] Typechecks pass for touched packages.
- [ ] No schema/type drift for Smartico fields (`smartico_*`, query history custom fields, etc).

## Auth and Transport

- [ ] Embedded frontend sends Smartico token in `jwt` header.
- [ ] Backend accepts Smartico JWT flow.
- [ ] PAT / ApiKey flow still works.
- [ ] No auth strategy registration collisions.

## Query Paths (Critical)

- [ ] `bq_project_id` rewrite is applied in `ProjectService` paths.
- [ ] `bq_project_id` rewrite is applied in `AsyncQueryService` paths.
- [ ] `/api/v2/.../query/field-values` returns expected values on BigQuery projects.
- [ ] Currency/token placeholder substitutions still work in expected responses.

## Dashboard and Frontend Runtime

- [ ] Dashboard loads without runtime reference errors.
- [ ] Tab modal save flow persists `smarticoEnableAiAnalysis` and `smarticoAiAnalysisPrompt`.
- [ ] AI stream reads latest tab prompt version.
- [ ] Chart/table parity checked for temporal dimensions.
- [ ] Temporal chart sanity checked:
  - [ ] stacked bar
  - [ ] stacked area
  - [ ] mixed bar+line

## Optional EE Service Guardrails

- [ ] Missing optional EE services fail gracefully (no unhandled `MissingConfigError` in normal routes).
- [ ] CE-compatible behavior verified where applicable.

## Build and Migration

- [ ] Backend build succeeds.
- [ ] Frontend build succeeds.
- [ ] Required package artifacts are present (no missing generated runtime files).
- [ ] DB migration strategy and environment scope are documented (dev/prod boundaries).

## Validation Evidence

- [ ] Commands run are listed (typecheck/tests/build).
- [ ] Manual verification notes are included for Smartico invariants.
- [ ] Remaining known risks and follow-ups are listed.

