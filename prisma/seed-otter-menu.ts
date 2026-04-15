/**
 * Adds menu categories + items from prisma/otter-menu.json to the Otter restaurant only.
 *
 * Resolves restaurant by (in order):
 *   - env OTTER_RESTAURANT_ID (Prisma cuid)
 *   - slug matches "otter" (case-insensitive)
 *   - name contains "otter" (case-insensitive)
 *
 * Optional: copy your .rtfd bundle to prisma/otter-import/menu.rtfd/ then on macOS run:
 *   textutil -convert txt -stdout prisma/otter-import/menu.rtfd/TXT.rtf
 * and paste the lines into otter-menu.json (price in cents).
 */
import * as fs from "fs";
import * as path from "path";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

type JsonItem = {
  name: string;
  description?: string | null;
  priceCents: number;
};

type JsonCategory = {
  name: string;
  sortOrder?: number;
  items: JsonItem[];
};

type JsonRoot = { categories: JsonCategory[] };

async function resolveOtterRestaurant() {
  const byEnv = process.env.OTTER_RESTAURANT_ID?.trim();
  if (byEnv) {
    const r = await prisma.restaurant.findUnique({ where: { id: byEnv } });
    if (r) return r;
    console.warn(`OTTER_RESTAURANT_ID=${byEnv} not found, trying slug/name…`);
  }

  const bySlug = await prisma.restaurant.findFirst({
    where: { slug: { equals: "otter", mode: "insensitive" } },
  });
  if (bySlug) return bySlug;

  return prisma.restaurant.findFirst({
    where: { name: { contains: "otter", mode: "insensitive" } },
  });
}

async function main() {
  const restaurant = await resolveOtterRestaurant();
  if (!restaurant) {
    console.error(
      "No Otter restaurant found. Create one in the dashboard (name or slug with “Otter”), or set OTTER_RESTAURANT_ID to its id."
    );
    process.exit(1);
  }

  const jsonPath = path.join(__dirname, "otter-menu.json");
  const raw = fs.readFileSync(jsonPath, "utf8");
  const data = JSON.parse(raw) as JsonRoot;
  if (!data.categories?.length) {
    console.error("otter-menu.json has no categories.");
    process.exit(1);
  }

  console.log(`Importing menu for: ${restaurant.name} (${restaurant.id})`);

  for (const catDef of data.categories) {
    const sortOrder = catDef.sortOrder ?? 0;
    let category = await prisma.menuCategory.findFirst({
      where: { restaurantId: restaurant.id, name: catDef.name },
    });
    if (!category) {
      category = await prisma.menuCategory.create({
        data: {
          name: catDef.name,
          sortOrder,
          restaurantId: restaurant.id,
        },
      });
      console.log(`  + category: ${catDef.name}`);
    }

    for (let i = 0; i < catDef.items.length; i++) {
      const item = catDef.items[i];
      const price = Math.round(item.priceCents);
      if (!item.name?.trim() || !Number.isFinite(price) || price < 0) {
        console.warn(`  skip invalid item in ${catDef.name}:`, item);
        continue;
      }
      const existing = await prisma.menuItem.findFirst({
        where: { categoryId: category.id, name: item.name.trim() },
      });
      if (existing) {
        console.log(`  = skip existing item: ${item.name}`);
        continue;
      }
      await prisma.menuItem.create({
        data: {
          name: item.name.trim(),
          description: item.description?.trim() || null,
          price,
          categoryId: category.id,
          sortOrder: i,
        },
      });
      console.log(`  + item: ${item.name} ($${(price / 100).toFixed(2)})`);
    }
  }

  console.log("Otter menu import done.");
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
