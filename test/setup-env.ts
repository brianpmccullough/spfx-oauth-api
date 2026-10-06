import { TEST_CLIENT_ID, TEST_TENANT_ID } from './utils/entra-test-tokens';
import { TEST_ALLOWED_ORIGIN } from './utils/test-env';

// Set before AppModule loads so config never comes from a developer's .env.
process.env.ENTRA_CLIENT_ID = TEST_CLIENT_ID;
process.env.ENTRA_TENANT_ID = TEST_TENANT_ID;
process.env.CORS_ALLOWED_ORIGINS = TEST_ALLOWED_ORIGIN;
