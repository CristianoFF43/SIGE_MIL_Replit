export type SelectOption = {
  value: string;
  label: string;
};

function normalizeOrderKey(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/\s+/g, " ")
    .trim();
}

export function buildFilterOptions(
  values: Array<string | null | undefined>,
  preferredOrder?: readonly string[],
  locale: string = "pt-BR",
): SelectOption[] {
  const seen = new Set<string>();
  const options: SelectOption[] = [];

  values.forEach((value) => {
    if (typeof value !== "string") return;
    if (value === "") return;
    if (seen.has(value)) return;
    seen.add(value);
    options.push({
      value,
      label: value.trim() || value,
    });
  });

  if (preferredOrder && preferredOrder.length > 0) {
    const orderMap = new Map<string, number>();
    preferredOrder.forEach((item, index) => {
      orderMap.set(normalizeOrderKey(item), index);
    });

    options.sort((a, b) => {
      const aOrder = orderMap.get(normalizeOrderKey(a.value));
      const bOrder = orderMap.get(normalizeOrderKey(b.value));

      if (aOrder !== undefined && bOrder !== undefined) {
        return aOrder - bOrder;
      }
      if (aOrder !== undefined) return -1;
      if (bOrder !== undefined) return 1;
      return a.label.localeCompare(b.label, locale);
    });
    return options;
  }

  return options.sort((a, b) => a.label.localeCompare(b.label, locale));
}

export function buildFilterOptionValues(
  values: Array<string | null | undefined>,
  preferredOrder?: readonly string[],
  locale: string = "pt-BR",
): string[] {
  return buildFilterOptions(values, preferredOrder, locale).map((option) => option.value);
}
