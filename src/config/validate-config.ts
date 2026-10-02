// class-transformer reads `design:type` metadata, which is only polyfilled
// once @nestjs/core loads; import it here so schemas work standalone too.
import 'reflect-metadata';

import { plainToInstance, type ClassConstructor } from 'class-transformer';
import { validateSync, type ValidationError } from 'class-validator';

/**
 * Validates raw environment variables against a class-validator schema,
 * reporting every invalid variable at once so startup fails with the full list.
 * Messages name the variable and the rule, never the value, so secrets stay out.
 */
export function validateConfig<T extends object>(
  schema: ClassConstructor<T>,
  env: Record<string, unknown>,
): T {
  const config = plainToInstance(schema, env);
  const errors = validateSync(config);
  if (errors.length > 0) {
    const issues = errors.map(formatValidationError).join('\n');
    throw new Error(`Invalid environment configuration:\n${issues}`);
  }
  return config;
}

function formatValidationError(error: ValidationError): string {
  const rules = Object.values(error.constraints ?? {}).join(', ');
  return `  ${error.property}: ${rules}`;
}
