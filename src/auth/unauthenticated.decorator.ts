import { SetMetadata } from '@nestjs/common';

export const IS_UNAUTHENTICATED_KEY = 'isUnauthenticated';

/**
 * Opts a controller or route out of the global Entra ID auth guard.
 * Every route requires a valid access token unless marked with this.
 */
export const Unauthenticated = () => SetMetadata(IS_UNAUTHENTICATED_KEY, true);
