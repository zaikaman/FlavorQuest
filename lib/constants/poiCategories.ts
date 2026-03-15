export const POI_CATEGORY_TAGS = ['snails', 'seafood', 'grill'] as const;

export type POICategoryTag = (typeof POI_CATEGORY_TAGS)[number];

export const POI_CATEGORY_OPTIONS: Array<{ value: POICategoryTag; label: string }> = [
  { value: 'snails', label: 'Ốc' },
  { value: 'seafood', label: 'Hải sản' },
  { value: 'grill', label: 'Nướng' },
];

export function normalizePOICategoryTags(input: unknown): POICategoryTag[] {
  if (!Array.isArray(input)) {
    return [];
  }

  const allowed = new Set<string>(POI_CATEGORY_TAGS);
  const normalized = input
    .filter((value): value is string => typeof value === 'string')
    .map((value) => value.trim())
    .filter((value) => allowed.has(value));

  return Array.from(new Set(normalized));
}
