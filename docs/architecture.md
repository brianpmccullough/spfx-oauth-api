# Architecture

Background and rationale for the conventions in [`AGENTS.md`](../AGENTS.md). Read this when you're building or changing auth, token handling, or vendor integrations; AGENTS.md has the condensed rules that apply to every change regardless.

## What this service does

`spfx-oauth-api` brokers OAuth flows between SharePoint Framework (SPFx) web parts and third-party vendor APIs (Wrike is the first target). The SPFx client cannot safely hold vendor OAuth client secrets or refresh tokens, so this API owns the vendor authorization-code flow, token custody, and token refresh, and exposes vendor capabilities to the client over its own authenticated endpoints.

Primary consumer: [brianpmccullough/spfx-oauth](https://github.com/brianpmccullough/spfx-oauth) — SPFx 1.23.2, Heft, pnpm, with a `spfxOauthWrike` web part.

This is a sample/reference application: favor clear, well-separated architecture over production hardening, but don't write code that would have to be thrown away to productionize — see [Token custody](#token-custody).

## Module layout

One Nest module per bounded concern, each a directory under `src/`:

```text
src/
  auth/        inbound Entra ID JWT validation, request principal
  vendors/     one subdirectory per vendor (wrike/, ...)
  tokens/      TokenStore port + adapters
  config/      typed configuration and env validation
```

Within a module: `*.controller.ts` (HTTP only), `*.service.ts` (business logic), `dto/` (request/response shapes), `*.module.ts` (wiring). Controllers stay thin — validate, delegate, map to a response DTO. No HTTP calls, token handling, or vendor knowledge in a controller.

Vendors sit behind a common interface so adding the second vendor requires no change to `auth/` or `tokens/`. Vendor-specific quirks (scope strings, token endpoint shapes, refresh semantics, error payloads) belong inside that vendor's directory and must not leak into shared code.

## Two distinct auth flows — don't conflate them

**Inbound (SPFx → this API):** the client uses SPFx `AadHttpClient` to acquire an Entra ID access token scoped to this API's app registration. This API validates the token on every request: signature against the tenant's JWKS, plus `iss`, `aud`, and expiry. Derive the user principal from token claims (prefer the immutable `oid`, not `upn` or `email`) and expose it via a guard + request-scoped principal (implemented as the global `EntraAuthGuard`, which attaches an `AuthenticatedUser` read with `@CurrentUser()`). Identity comes from the validated token only — never from a request body, query string, or custom header.

**Outbound (this API → vendor):** a standard OAuth 2.0 authorization-code flow against the vendor, keyed to the inbound Entra principal. The vendor's `client_secret` lives only in server configuration. Use PKCE where the vendor supports it, treat the `state` parameter as a CSRF defense that must be generated, stored, and verified server-side, and validate the redirect URI against an allowlist.

The mapping between the two is the heart of this service: one Entra `oid` ⇄ one vendor connection per vendor.

## Token custody

Vendor access and refresh tokens are persisted behind a port, e.g. `TokenStore`, with operations along the lines of get / save / delete, keyed by `(principalId, vendorId)`.

Ship an in-memory adapter for now. It's the right choice for a sample, but write it as one implementation among several: all consumers depend on the interface, the adapter is bound in a module provider, and swapping in Redis or a database should be a new adapter plus one provider change — no edits to vendor or controller code. Keep the interface `async` even though the in-memory version resolves immediately, so a real adapter doesn't force a refactor of every call site.

Make the in-memory adapter's limitations explicit in its own doc comment: tokens vanish on restart and don't survive multiple instances. Don't paper over that in the API's behavior.

## Open decisions

Don't invent answers to these; surface them instead.

- **Hosting and deployment** are undecided. `@nestjs/mau` is in `devDependencies` from the Nest scaffold and the `deploy` script is stock — neither reflects a chosen target. Leave deployment config out until this is settled.
- **Persistent token storage** is deliberately deferred to the `TokenStore` port.
- `README.md` is still Nest boilerplate and should be replaced with real project documentation at some point.
