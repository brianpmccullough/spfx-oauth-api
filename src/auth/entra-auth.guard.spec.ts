import { Controller, Get, INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import {
  EntraTestTokens,
  TEST_CLIENT_ID,
  TEST_OID,
  TEST_TENANT_ID,
} from '../../test/utils/entra-test-tokens';
import { AuthModule } from './auth.module';
import { CurrentUser } from './current-user.decorator';
import { ENTRA_JWKS } from './entra-token-verifier.service';
import type { AuthenticatedUser } from './models/authenticated-user';
import { Unauthenticated } from './unauthenticated.decorator';

@Controller()
class ProbeController {
  @Get('protected')
  protected(@CurrentUser() user: AuthenticatedUser): AuthenticatedUser {
    return user;
  }

  @Unauthenticated()
  @Get('open')
  open(): string {
    return 'open';
  }
}

@Unauthenticated()
@Controller('open-controller')
class OpenController {
  @Get()
  get(): string {
    return 'open';
  }
}

describe('EntraAuthGuard', () => {
  let app: INestApplication<App>;
  let tokens: EntraTestTokens;

  beforeAll(async () => {
    tokens = await EntraTestTokens.create();
    const moduleRef = await Test.createTestingModule({
      imports: [AuthModule],
      controllers: [ProbeController, OpenController],
    })
      .overrideProvider(ENTRA_JWKS)
      .useValue(tokens.jwks)
      .compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  const getProtected = (token?: string) => {
    const req = request(app.getHttpServer()).get('/protected');
    return token ? req.set('Authorization', `Bearer ${token}`) : req;
  };

  it('accepts a valid v1.0 token and exposes the authenticated user', async () => {
    const token = await tokens.sign({
      claims: {
        upn: 'adele@contoso.com',
        name: 'Adele Vance',
        roles: ['Reader'],
      },
    });
    const res = await getProtected(token);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      oid: TEST_OID,
      tenantId: TEST_TENANT_ID,
      upn: 'adele@contoso.com',
      name: 'Adele Vance',
      scopes: ['user_impersonation'],
      roles: ['Reader'],
      accessToken: token,
    });
  });

  it('accepts a valid v2.0 token', async () => {
    const token = await tokens.sign({
      claims: {
        iss: `https://login.microsoftonline.com/${TEST_TENANT_ID}/v2.0`,
        aud: TEST_CLIENT_ID,
      },
    });
    await getProtected(token).expect(200);
  });

  it('rejects a request without a token', async () => {
    const res = await getProtected();
    expect(res.status).toBe(401);
    expect(res.headers['www-authenticate']).toBe('Bearer');
  });

  it('rejects a non-bearer authorization header', async () => {
    await request(app.getHttpServer())
      .get('/protected')
      .set('Authorization', `Basic ${await tokens.sign()}`)
      .expect(401);
  });

  it.each<[string, () => Promise<string>]>([
    [
      'expired',
      () => tokens.sign({ expiresIn: Math.floor(Date.now() / 1000) - 120 }),
    ],
    [
      'tampered signature',
      async () =>
        tokens.sign({ signingKey: await EntraTestTokens.foreignKey() }),
    ],
    [
      'wrong audience',
      () => tokens.sign({ claims: { aud: 'api://someone-else' } }),
    ],
    [
      'wrong issuer',
      () =>
        tokens.sign({
          claims: { iss: 'https://sts.windows.net/other-tenant/' },
        }),
    ],
    ['app-only (no scp)', () => tokens.sign({ claims: { scp: undefined } })],
    ['missing oid', () => tokens.sign({ claims: { oid: undefined } })],
  ])('rejects a token that is %s', async (_case, makeToken) => {
    const res = await getProtected(await makeToken());
    expect(res.status).toBe(401);
    expect(res.headers['www-authenticate']).toBe(
      'Bearer error="invalid_token"',
    );
  });

  it('rejects a malformed token', async () => {
    await getProtected('not-a-jwt').expect(401);
  });

  it('skips auth on a route marked @Unauthenticated()', async () => {
    await request(app.getHttpServer()).get('/open').expect(200, 'open');
  });

  it('skips auth on a controller marked @Unauthenticated()', async () => {
    await request(app.getHttpServer())
      .get('/open-controller')
      .expect(200, 'open');
  });
});
