// The Docker images ship placeholders such as `__API_URL__` in config.js, which the container
// replaces with real values at start-up. A value that still starts with `__` was never filled in.

/** The value, or undefined when it is empty or still an unreplaced `__PLACEHOLDER__`. */
export function configuredValue(value: string | null | undefined): string | undefined {
  if (!value || value.trim() === '' || value.startsWith('__')) return undefined;
  return value;
}
