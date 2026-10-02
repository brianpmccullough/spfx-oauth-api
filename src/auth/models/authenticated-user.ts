/**
 * The caller, derived solely from a validated Entra ID access token. Pass this
 * to services that need to know who is acting.
 */
export interface AuthenticatedUser {
  /** Immutable object ID of the user; the key for all per-user state. */
  readonly oid: string;
  readonly tenantId: string;
  /** Sign-in name, for display only; it can change, so never key on it. */
  readonly upn?: string;
  readonly name?: string;
  readonly scopes: readonly string[];
  readonly roles: readonly string[];
  /**
   * The validated inbound access token, kept for on-behalf-of exchanges.
   * Never log or serialize it.
   */
  readonly accessToken: string;
}
