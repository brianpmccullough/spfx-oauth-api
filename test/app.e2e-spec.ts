import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { ENTRA_JWKS } from './../src/auth/entra-token-verifier.service';
import { configureCors } from './../src/cors';
import { EntraTestTokens } from './utils/entra-test-tokens';
import { TEST_ALLOWED_ORIGIN } from './utils/test-env';

describe('AppController (e2e)', () => {
  let app: INestApplication<App>;
  let tokens: EntraTestTokens;

  beforeEach(async () => {
    tokens = await EntraTestTokens.create();
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(ENTRA_JWKS)
      .useValue(tokens.jwks)
      .compile();

    app = moduleFixture.createNestApplication();
    configureCors(app);
    await app.init();
  });

  it('/ (GET) requires a token', () => {
    return request(app.getHttpServer()).get('/').expect(401);
  });

  it('/ (GET)', async () => {
    return request(app.getHttpServer())
      .get('/')
      .set('Authorization', `Bearer ${await tokens.sign()}`)
      .expect(200)
      .expect('Hello World!');
  });

  it('answers a CORS preflight from an allowed origin without a token', async () => {
    const res = await request(app.getHttpServer())
      .options('/')
      .set('Origin', TEST_ALLOWED_ORIGIN)
      .set('Access-Control-Request-Method', 'GET')
      .set('Access-Control-Request-Headers', 'authorization');
    expect(res.status).toBe(204);
    expect(res.headers['access-control-allow-origin']).toBe(
      TEST_ALLOWED_ORIGIN,
    );
    expect(res.headers['access-control-allow-headers']).toContain(
      'Authorization',
    );
  });

  it('does not allow an unlisted origin', async () => {
    const res = await request(app.getHttpServer())
      .options('/')
      .set('Origin', 'https://evil.example.com')
      .set('Access-Control-Request-Method', 'GET');
    expect(res.headers['access-control-allow-origin']).toBeUndefined();
  });

  afterEach(async () => {
    await app.close();
  });
});
