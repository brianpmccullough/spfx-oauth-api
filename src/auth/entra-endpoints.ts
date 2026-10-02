const AUTHORITY_HOST = 'https://login.microsoftonline.com';

/** Signing keys are shared by v1.0 and v2.0 tokens for a tenant. */
export function jwksUri(tenantId: string): URL {
  return new URL(`/${tenantId}/discovery/v2.0/keys`, AUTHORITY_HOST);
}

/**
 * SPFx `AadHttpClient` receives v1.0 tokens unless the app registration's
 * manifest sets `accessTokenAcceptedVersion: 2`, so both issuers are accepted.
 */
export function issuers(tenantId: string): string[] {
  return [
    `${AUTHORITY_HOST}/${tenantId}/v2.0`,
    `https://sts.windows.net/${tenantId}/`,
  ];
}

/** v2.0 tokens carry the client ID as `aud`; v1.0 tokens the Application ID URI. */
export function audiences(clientId: string): string[] {
  return [clientId, `api://${clientId}`];
}
