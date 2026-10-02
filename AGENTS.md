# AGENTS.md

## Goal

Make changes that match the conventions in this file and stay reviewable — prefer the smallest diff that correctly does the job, not the smallest diff that technically compiles.

## What this project is

`spfx-oauth-api` is a NestJS backend that brokers OAuth flows between SharePoint Framework (SPFx) extensions([brianpmccullough/spfx-oauth](https://github.com/brianpmccullough/spfx-oauth)) and third-party vendor APIs (Wrike is the first target), so the SPFx client never has to hold vendor secrets or tokens itself.

It's a sample/reference app: favor clear, well-separated architecture over production hardening.

Full architecture: [`docs/architecture.md`](docs/architecture.md).

## Commands

Package manager is **npm** (`package-lock.json`).

```bash
npm install
npm run start:dev      # watch mode; listens on PORT, default 3000
npm run build          # nest build -> dist/ (gitignored)
npm run lint           # oxlint --type-aware src/ test/
npm run format         # prettier --write over src/ and test/
npm test               # Jest unit tests: *.spec.ts under src/
npm run test:e2e       # Jest e2e: *.e2e-spec.ts under test/
npm run test:cov       # coverage -> coverage/
```

## Stack and toolchain facts

- **NestJS 12** on `@nestjs/platform-express`, **TypeScript 6**, target ES2023.
- `module`/`moduleResolution` are **`nodenext`** with `resolvePackageJsonExports`. Be deliberate about import specifiers and package entry points; this is stricter than the `commonjs` setup most Nest examples assume.
- `strict: true`, with `strictPropertyInitialization: false` (so Nest's injected/decorated properties don't need initializers).
- **oxlint**, not ESLint. `no-floating-promises` and `no-explicit-any` are both **errors** — await/void/catch every promise, type everything. For a genuine one-off, override inline with `// oxlint-disable-next-line <rule>` plus a reason, not a config change.
- **Prettier**: single quotes, trailing commas everywhere, imports auto-organized via `prettier-plugin-organize-imports` — don't hand-order imports, `npm run format` fixes them.
- Jest runs tests as native ESM (`node --experimental-vm-modules` in the `test*` scripts, plus ts-jest `useESM` in both configs) because Nest 12 and `jose` ship ESM only. Invoke tests through the npm scripts rather than a bare `jest` — a direct call drops that flag and ESM-resolving tests fail confusingly.

### Two Jest configs, one gotcha

`jest.config.ts` reads `compilerOptions.paths` out of `tsconfig.json` and feeds them to `moduleNameMapper`, so **path aliases work in unit tests automatically** — add aliases to `tsconfig.json` only, never duplicate them in the Jest config.

`test/jest-e2e.json` does **not** do this. If you add a path alias and use it from an e2e test, resolution will fail. Either port the alias mapping into the e2e config or convert it to a `.ts` config that shares the same logic.

Anything else shared between the two configs must also be changed in both: the ESM transform, and `setupFiles: test/setup-env.ts`, which sets test values for the required env vars before `AppModule` loads (so tests never read a developer's `.env`).

## Architecture rules

Full rationale and the auth-flow/token-custody design: [`docs/architecture.md`](docs/architecture.md). Read that before building auth, token, or vendor-integration code.

- One Nest module per bounded concern (`auth/`, `vendors/<vendor>/`, `tokens/`, `config/`). Controllers stay thin — no HTTP calls, token handling, or vendor knowledge in a controller.
- Every route requires a valid Entra ID bearer token by default (global `EntraAuthGuard` in `auth/`). Opt a route or controller out with `@Unauthenticated()`. Read the caller with `@CurrentUser()`, which yields the `AuthenticatedUser` domain object (including the validated access token, for future OBO) — pass that to services rather than re-reading the request.
- Configuration is two-tier, and only `config/` and a vendor's own config file read the environment — never `process.env` elsewhere:
  - **Core and cross-cutting** (port, CORS, Entra IDs and future shared secrets) go in `config/environment-variables.schema.ts` (class-validator, validated by `ConfigModule.forRoot`) and are read through `ConfigurationService.settings`. Required vars are listed in `.env.example`.
  - **Vendor-specific** variables belong to the vendor module: its own schema class validated with the shared `validateConfig` helper, exposed as a typed provider. Don't add them to the global schema.
- Vendor tokens are persisted behind a `TokenStore` port (in-memory adapter for now); don't reach for a concrete store directly from vendor or controller code.
- A missing or expired vendor connection is a normal, expected state, not a crash — return something the client can act on, not a 500.

## Code quality

- Follow SOLID and DRY.
- Extract primitive manipulation (string, numeric, date/time parsing or formatting) out of inline controller/service code and into a private method or a shared utility — never repeat the same `string`/`Date`/`number` wrangling in two places.
- Minimize regex. Prefer built-in APIs (`URL`, `Date`/`Intl`, `String.prototype` methods) or a small named helper function; reach for regex only when there's genuinely no reasonable alternative, and comment what the pattern matches and why.

## Security

- Identity comes from the validated inbound Entra ID JWT only — **never** from a request body, query string, or custom header. Prefer the immutable `oid` claim over `upn`/`email`.
- Tokens, refresh tokens, authorization codes, `client_secret`s, and raw JWTs **never** appear in logs, error messages, response DTOs, or exception payloads. When in doubt, log nothing.
- No secrets in committed files. Secrets come from the environment; `.env*` is gitignored. Validate required configuration at startup and fail fast.
- Vendor API errors get translated into this API's own error shape. Never forward a raw vendor response body to the client.

## Testing conventions

- Unit tests live beside the code as `*.spec.ts`; e2e tests live in `test/` as `*.e2e-spec.ts`.
- Use Nest's `Test.createTestingModule` with the real DI container and override providers, rather than hand-constructing classes — it keeps tests honest about wiring.
- Never call a real vendor API or a real Entra tenant from a test. Stub the vendor HTTP boundary and inject signed-with-a-test-key JWTs for the inbound path.
- Token-handling code deserves tests for the unhappy paths specifically: expired inbound token, tampered signature, wrong audience, missing vendor connection, expired refresh token, and a refresh that the vendor rejects.
- The in-memory `TokenStore` doubles as the test double for most tests — another reason to keep its interface honest.

## Before committing

- Run `npm run lint`, `npm run format`, and `npm test` — all three must pass clean.
- No commit message or branch naming convention is established yet; follow the existing git log style (short, imperative subject line) until one is.

## Open decisions

Hosting/deployment and persistent token storage are undecided — don't invent answers, surface the question instead. Details: [`docs/architecture.md`](docs/architecture.md#open-decisions).
