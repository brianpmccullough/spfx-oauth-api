export interface EntraSettings {
  readonly clientId: string;
  readonly tenantId: string;
}

export interface Settings {
  readonly port: number;
  readonly corsAllowedOrigins: readonly string[];
  readonly entra: EntraSettings;
}
