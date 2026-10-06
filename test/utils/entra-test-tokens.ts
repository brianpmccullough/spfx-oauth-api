import {
  createLocalJWKSet,
  exportJWK,
  generateKeyPair,
  SignJWT,
  type CryptoKey,
  type JWTPayload,
  type JWTVerifyGetKey,
} from 'jose';

export const TEST_TENANT_ID = '00000000-0000-4000-8000-00000000aaaa';
export const TEST_CLIENT_ID = '00000000-0000-4000-8000-00000000bbbb';
export const TEST_OID = '00000000-0000-4000-8000-00000000cccc';

const KID = 'test-key';

export interface TestTokenOptions {
  claims?: JWTPayload;
  expiresIn?: string | number;
  signingKey?: CryptoKey;
}

/**
 * Issues Entra-shaped access tokens signed with a local test key, plus the
 * matching key set to inject in place of the tenant's remote JWKS.
 */
export class EntraTestTokens {
  private constructor(
    private readonly privateKey: CryptoKey,
    readonly jwks: JWTVerifyGetKey,
  ) {}

  static async create(): Promise<EntraTestTokens> {
    const { publicKey, privateKey } = await generateKeyPair('RS256');
    const jwk = { ...(await exportJWK(publicKey)), kid: KID, alg: 'RS256' };
    return new EntraTestTokens(privateKey, createLocalJWKSet({ keys: [jwk] }));
  }

  /** A key that is not in {@link jwks}, for forged-signature tests. */
  static async foreignKey(): Promise<CryptoKey> {
    return (await generateKeyPair('RS256')).privateKey;
  }

  async sign(options: TestTokenOptions = {}): Promise<string> {
    return new SignJWT({
      iss: `https://sts.windows.net/${TEST_TENANT_ID}/`,
      aud: `api://${TEST_CLIENT_ID}`,
      oid: TEST_OID,
      tid: TEST_TENANT_ID,
      scp: 'user_impersonation',
      ...options.claims,
    })
      .setProtectedHeader({ alg: 'RS256', kid: KID, typ: 'JWT' })
      .setIssuedAt()
      .setExpirationTime(options.expiresIn ?? '5m')
      .sign(options.signingKey ?? this.privateKey);
  }
}
