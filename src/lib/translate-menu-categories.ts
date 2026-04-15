import { translateTexts } from "./translate-batch";

type OptionChoice = { id: string; label: string; priceCents: number };
type OptionGroup = {
  id: string;
  label: string;
  required: boolean;
  type: "single" | "multi";
  choices: OptionChoice[];
};

export type MenuCategoryPayload = {
  id: string;
  name: string;
  items: {
    id: string;
    name: string;
    description?: string;
    price: number;
    imageUrl?: string;
    optionGroups?: OptionGroup[];
  }[];
};

/** Collect all human-readable strings in menu tree (stable order). */
function collectStrings(categories: MenuCategoryPayload[]): string[] {
  const strings: string[] = [];
  for (const cat of categories) {
    strings.push(cat.name);
    for (const item of cat.items) {
      strings.push(item.name);
      if (item.description) strings.push(item.description);
      const groups = item.optionGroups ?? [];
      for (const g of groups) {
        strings.push(g.label);
        for (const c of g.choices) {
          strings.push(c.label);
        }
      }
    }
  }
  return strings;
}

/** Apply translated strings back (same order as collectStrings). */
function applyStrings(categories: MenuCategoryPayload[], translated: string[]): MenuCategoryPayload[] {
  let i = 0;
  const next = JSON.parse(JSON.stringify(categories)) as MenuCategoryPayload[];
  for (const cat of next) {
    cat.name = translated[i++] ?? cat.name;
    for (const item of cat.items) {
      item.name = translated[i++] ?? item.name;
      if (item.description) {
        item.description = translated[i++] ?? item.description;
      }
      const groups = item.optionGroups ?? [];
      for (const g of groups) {
        g.label = translated[i++] ?? g.label;
        for (const c of g.choices) {
          c.label = translated[i++] ?? c.label;
        }
      }
    }
  }
  return next;
}

export async function translateMenuCategories(
  categories: MenuCategoryPayload[],
  sourceLocale: string,
  targetLocale: string
): Promise<MenuCategoryPayload[]> {
  if (sourceLocale === targetLocale) return categories;
  const originals = collectStrings(categories);
  const translated = await translateTexts(originals, sourceLocale, targetLocale);
  return applyStrings(categories, translated);
}
