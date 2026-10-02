import { Type } from 'class-transformer';
import { ArrayNotEmpty, IsInt, IsUUID, Max, Min } from 'class-validator';
import { IsOrigin, ToList } from './config-decorators';
import { validateConfig } from './validate-config';

/**
 * Core and cross-cutting settings. Vendor-specific variables belong to their
 * vendor module's own schema, not here.
 */
export class EnvironmentVariables {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(65535)
  PORT: number = 3000;

  @ToList()
  @ArrayNotEmpty()
  @IsOrigin({ each: true })
  CORS_ALLOWED_ORIGINS: string[];

  /** Application (client) ID of this API's Entra ID app registration. */
  @IsUUID()
  ENTRA_CLIENT_ID: string;

  /** Directory (tenant) ID whose users may call this API. */
  @IsUUID()
  ENTRA_TENANT_ID: string;
}

export function validate(env: Record<string, unknown>): EnvironmentVariables {
  return validateConfig(EnvironmentVariables, env);
}
