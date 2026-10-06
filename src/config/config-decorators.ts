import { Transform } from 'class-transformer';
import {
  buildMessage,
  ValidateBy,
  type ValidationOptions,
} from 'class-validator';

/** Parses a comma-separated variable into a list, dropping blank entries. */
export const ToList = () =>
  Transform(({ value }: { value: unknown }) =>
    typeof value === 'string'
      ? value
          .split(',')
          .map((entry) => entry.trim())
          .filter(Boolean)
      : value,
  );

/** A bare origin (scheme + host + optional port), e.g. https://contoso.sharepoint.com. */
export function isOrigin(value: unknown): boolean {
  return (
    typeof value === 'string' &&
    URL.canParse(value) &&
    new URL(value).origin === value
  );
}

export const IsOrigin = (options?: ValidationOptions) =>
  ValidateBy(
    {
      name: 'isOrigin',
      validator: {
        validate: isOrigin,
        defaultMessage: buildMessage(
          (eachPrefix) =>
            `${eachPrefix}$property must be a bare origin, e.g. https://contoso.sharepoint.com`,
          options,
        ),
      },
    },
    options,
  );
