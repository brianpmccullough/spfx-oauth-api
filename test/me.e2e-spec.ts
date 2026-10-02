import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { ENTRA_JWKS } from './../src/auth/entra-token-verifier.service';
import { EntraTestTokens, TEST_TENANT_ID } from './utils/entra-test-tokens';

describe('MeController (e2e)', () => {
  let app: INestApplication<App>;
  let tokens: EntraTestTokens;

  beforeAll(async () => {
    tokens = await EntraTestTokens.create();
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(ENTRA_JWKS)
      .useValue(tokens.jwks)
      .compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  const getMe = (token: string) =>
    request(app.getHttpServer())
      .get('/me')
      .set('Authorization', `Bearer ${token}`);

  it('returns the upn, name and token from a v1.0 token', async () => {
    const token = await tokens.sign({
      claims: { upn: 'adele@contoso.com', name: 'Adele Vance' },
    });
    await getMe(token).expect(200, {
      upn: 'adele@contoso.com',
      name: 'Adele Vance',
      bearerToken: token,
    });
  });

  it('reads the upn from preferred_username in a v2.0 token', async () => {
    const token = await tokens.sign({
      claims: {
        iss: `https://login.microsoftonline.com/${TEST_TENANT_ID}/v2.0`,
        aud: process.env.ENTRA_CLIENT_ID,
        preferred_username: 'adele@contoso.com',
      },
    });
    const res = await getMe(token).expect(200);
    expect(res.body).toEqual({
      upn: 'adele@contoso.com',
      name: null,
      bearerToken: token,
    });
  });

  it('requires a token', async () => {
    await request(app.getHttpServer()).get('/me').expect(401);
  });
});
