## Plan: Migrate Frontend Hosting to AWS Amplify

Migrate the frontend from App Runner container hosting to Amplify Hosting for main and PR preview environments, while keeping backend/App Runner paths unchanged. The approach removes frontend App Runner Terraform resources, introduces Amplify Terraform resources and routing config, converts frontend runtime config to build-time env usage, and updates this repo’s CI/workflow orchestration to provision/deploy Amplify for main + previews. Changes required in NHSDigital/nhs-notify-internal are documented as explicit external dependencies and excluded from in-repo implementation scope.

**Steps**
1. Phase 1: Baseline and migration guardrails
1. Confirm current frontend deploy dependencies and references to App Runner frontend service so the removal is complete and non-breaking. Reuse current naming/environment conventions from [infrastructure/terraform/components/admail/locals.tf](infrastructure/terraform/components/admail/locals.tf) and current workflow dispatch contracts in [.github/workflows/cicd-1-pull-request.yaml](.github/workflows/cicd-1-pull-request.yaml).
1. Define environment mapping for Amplify branches: main -> persistent main branch, PR previews -> ephemeral/pr-branch mapping aligned to PR number conventions already used in CI (pr<PR_NUMBER>) from [.github/workflows/cicd-1-pull-request.yaml](.github/workflows/cicd-1-pull-request.yaml#L193).

1. Phase 2: Frontend runtime config refactor (blocks infra cutover)
1. Remove runtime-first dependency on window.env in frontend code paths and standardize on build-time REACT_APP_* variables (CRA compile-time model). Update env access patterns in [containers/frontend/src/api/BackendAPIClient.js](containers/frontend/src/api/BackendAPIClient.js), [containers/frontend/src/Pages/FileUploadPage.js](containers/frontend/src/Pages/FileUploadPage.js), [containers/frontend/src/components/AuthContext.js](containers/frontend/src/components/AuthContext.js), [containers/frontend/src/components/Header.js](containers/frontend/src/components/Header.js), and [containers/frontend/src/components/Login.js](containers/frontend/src/components/Login.js).
1. Remove now-obsolete runtime config bootstrap dependency from [containers/frontend/public/index.html](containers/frontend/public/index.html) and deprecate [containers/frontend/public/env-config.js](containers/frontend/public/env-config.js) and [containers/frontend/entrypoint.sh](containers/frontend/entrypoint.sh) from frontend hosting path.
1. Validate local and CI frontend build still succeeds with required REACT_APP_* values injected at build time via npm scripts/workflow environment.

1. Phase 3: Terraform migration from App Runner frontend to Amplify
1. Add Amplify resources to admail component (new Terraform files under infrastructure/terraform/components/admail): app, branch(es), optional domain association, and required IAM/service role bindings for Amplify build/deploy.
1. Preserve backend deployment components unchanged (backend App Runner, lambdas, API Gateway).
1. Remove or disable frontend App Runner resource definition and associated data/locals references from [infrastructure/terraform/components/admail/apprunner_service_frontend.tf](infrastructure/terraform/components/admail/apprunner_service_frontend.tf) and any coupled variables/outputs.
1. Configure Amplify SPA rewrite/redirect rules equivalent to current Nginx deep-link behavior from [containers/frontend/nginx.conf](containers/frontend/nginx.conf#L22).
1. Define Amplify environment variable inputs from Terraform/workflow variables for REACT_APP_BACKEND_URL, REACT_APP_API_GATEWAY_URL, REACT_APP_COGNITO_USER_POOL_ID, REACT_APP_COGNITO_CLIENT_ID to preserve existing app behavior.

1. Phase 4: Workflow and build orchestration updates (parallel with Terraform authoring after env contract is fixed)
1. Add repo-level Amplify build/deploy configuration for monorepo frontend path (for example amplify.yml at repo root or equivalent workflow-driven deployment contract) using frontend app root containers/frontend and build output location aligned to CRA build folder.
1. Update CI orchestration for main + PR preview deploy paths in this repo’s workflows so frontend deploy no longer depends on frontend container image/App Runner assumptions. Primary touchpoints: [.github/workflows/cicd-1-pull-request.yaml](.github/workflows/cicd-1-pull-request.yaml), [.github/workflows/pr_closed.yml](.github/workflows/pr_closed.yml), [.github/workflows/release_created.yml](.github/workflows/release_created.yml).
1. Keep internal dispatch integration points intact where required, but mark cross-repo workflow updates as external dependency tasks (out of scope here).

1. Phase 5: Cutover safety, cleanup, and documentation
1. Add rollback strategy: retain reversible Terraform path for one release window (feature flag/conditional variable or staged apply order) so frontend can be reverted if Amplify deploy fails.
1. Remove obsolete Docker/Nginx frontend hosting assumptions from documentation and scripts once Amplify path is stable; keep local docker-compose developer flow if still needed for local integration only.
1. Update docs with new deployment model, required env vars, and preview environment lifecycle.

**Relevant files**
- [containers/frontend/package.json](containers/frontend/package.json) — frontend build/test/lint scripts; confirm CRA build contract.
- [containers/frontend/src/App.js](containers/frontend/src/App.js) — BrowserRouter behavior requiring SPA rewrite.
- [containers/frontend/src/api/BackendAPIClient.js](containers/frontend/src/api/BackendAPIClient.js) — env var access pattern to migrate from runtime fallback.
- [containers/frontend/src/Pages/FileUploadPage.js](containers/frontend/src/Pages/FileUploadPage.js) — API URL env usage.
- [containers/frontend/src/components/AuthContext.js](containers/frontend/src/components/AuthContext.js) — Cognito env usage.
- [containers/frontend/public/index.html](containers/frontend/public/index.html) — remove env-config.js runtime bootstrap reference.
- [containers/frontend/public/env-config.js](containers/frontend/public/env-config.js) — likely remove/deprecate.
- [containers/frontend/entrypoint.sh](containers/frontend/entrypoint.sh) — runtime env injection script (container-specific).
- [containers/frontend/nginx.conf](containers/frontend/nginx.conf) — source of SPA rewrite/caching behavior to replicate in Amplify config.
- [infrastructure/terraform/components/admail/apprunner_service_frontend.tf](infrastructure/terraform/components/admail/apprunner_service_frontend.tf) — frontend App Runner resource to replace.
- [infrastructure/terraform/components/admail/locals.tf](infrastructure/terraform/components/admail/locals.tf) — naming/domain conventions to reuse for Amplify resources.
- [infrastructure/terraform/components/admail/pre.sh](infrastructure/terraform/components/admail/pre.sh) — pre-hook build assumptions to adjust if frontend container build is removed.
- [.github/workflows/cicd-1-pull-request.yaml](.github/workflows/cicd-1-pull-request.yaml) — PR preview provisioning flow and environment naming.
- [.github/workflows/pr_closed.yml](.github/workflows/pr_closed.yml) — main deploy trigger path.
- [.github/workflows/release_created.yml](.github/workflows/release_created.yml) — release/nonprod deploy trigger path (ensure no frontend-App Runner coupling remains).
- [.github/scripts/dispatch_internal_repo_workflow.sh](.github/scripts/dispatch_internal_repo_workflow.sh) — external dispatch contract boundary.

**Verification**
1. Frontend build verification: run workspace frontend build and tests with Amplify-style build-time env variables injected; confirm no runtime window.env dependency remains.
1. Terraform validation: run formatting and validation/plan for admail component to confirm Amplify resources resolve and App Runner frontend removal has no dangling references.
1. PR preview flow test: open/update a PR branch and verify expected preview branch/environment provisioning path and URL generation.
1. Main deployment test: merge to main in non-production account path and verify frontend is served from Amplify with working SPA deep links and auth/api integrations.
1. Smoke tests: validate login, upload journey, API calls, and direct navigation to nested routes.
1. Repo quality gates: run pre-commit checks from AGENTS guidance and required lint/typecheck/unit tests relevant to touched workspaces.

**Decisions**
- Included scope: replace frontend App Runner hosting with Amplify; environments main + PR previews.
- Included scope: migrate to build-time frontend configuration (REACT_APP_*), remove runtime window.env dependence for hosted path.
- Excluded scope: direct code/workflow changes in NHSDigital/nhs-notify-internal; capture these as external dependency tasks.
- Excluded scope: backend hosting migration; backend remains on existing App Runner/API/Lambda stack.

**Further Considerations**
1. Domain cutover sequencing: choose DNS switch strategy (single-step cutover vs weighted/temporary subdomain) before production cutover window.
2. Preview cleanup lifecycle: ensure PR close/destroy lifecycle includes Amplify preview branch teardown to prevent cost/resource drift.
3. TODO: CCM-12345 Add cross-repo implementation task list for NHSDigital/nhs-notify-internal workflow updates required by this migration.