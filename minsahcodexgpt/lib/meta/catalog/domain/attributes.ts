export function catalogAttributes(value: unknown) {
  const source = value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
  const text = (key: string) => typeof source[key] === 'string' && source[key].trim()
    ? source[key].trim()
    : undefined;
  return {
    color: text('color') ?? text('shade'),
    size: text('size'),
    pattern: text('pattern'),
    material: text('material'),
  };
}
