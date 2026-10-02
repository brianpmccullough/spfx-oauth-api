import { validate } from './environment-variables.schema';

const CLIENT_ID = '291519cc-fc6f-4cc6-8045-7db0d00a6ecb';
const TENANT_ID = '00000000-0000-4000-8000-00000000aaaa';

const validEnv = {
  CORS_ALLOWED_ORIGINS: 'https://contoso.sharepoint.com',
  ENTRA_CLIENT_ID: CLIENT_ID,
  ENTRA_TENANT_ID: TENANT_ID,
};

describe('EnvironmentVariables', () => {
  it('parses and converts a valid environment', () => {
    const config = validate({
      ...validEnv,
      PORT: '8080',
      CORS_ALLOWED_ORIGINS:
        ' https://contoso.sharepoint.com , ,http://localhost:4321',
    });
    expect(config).toMatchObject({
      PORT: 8080,
      CORS_ALLOWED_ORIGINS: [
        'https://contoso.sharepoint.com',
        'http://localhost:4321',
      ],
      ENTRA_CLIENT_ID: CLIENT_ID,
      ENTRA_TENANT_ID: TENANT_ID,
    });
  });

  it('defaults PORT to 3000', () => {
    expect(validate(validEnv).PORT).toBe(3000);
  });

  it('reports every invalid variable at once', () => {
    expect(() => validate({ PORT: 'abc' })).toThrow(
      expect.objectContaining({
        message: expect.stringMatching(
          /PORT[\s\S]*CORS_ALLOWED_ORIGINS[\s\S]*ENTRA_CLIENT_ID[\s\S]*ENTRA_TENANT_ID/,
        ) as unknown,
      }),
    );
  });

  it.each(['', ' , '])('rejects an empty origin list (%p)', (value) => {
    expect(() =>
      validate({ ...validEnv, CORS_ALLOWED_ORIGINS: value }),
    ).toThrow('CORS_ALLOWED_ORIGINS');
  });

  it.each([
    'contoso.sharepoint.com',
    'https://contoso.sharepoint.com/',
    'https://contoso.sharepoint.com/sites/x',
    '*',
  ])('rejects %p, which is not a bare origin', (value) => {
    expect(() =>
      validate({ ...validEnv, CORS_ALLOWED_ORIGINS: value }),
    ).toThrow('must be a bare origin');
  });

  it('rejects a non-GUID tenant ID without echoing the value', () => {
    expect(() =>
      validate({ ...validEnv, ENTRA_TENANT_ID: 'contoso.onmicrosoft.com' }),
    ).toThrow(
      expect.objectContaining({
        message: expect.not.stringContaining(
          'contoso.onmicrosoft.com',
        ) as unknown,
      }),
    );
  });
});
