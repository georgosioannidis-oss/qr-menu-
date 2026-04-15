/**
 * Run before `npx prisma db push` if you need NOT NULL on tableSectionId.
 * With optional FK, run once to assign any tables missing a section to "Main".
 *
 *   npx tsx prisma/backfill-table-sections.ts
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const restaurants = await prisma.restaurant.findMany({ select: { id: true } });
  for (const { id: restaurantId } of restaurants) {
    const orphans = await prisma.table.findMany({
      where: { restaurantId, tableSectionId: null },
    });
    if (orphans.length === 0) continue;

    let section = await prisma.tableSection.findFirst({
      where: { restaurantId },
      orderBy: { sortOrder: "asc" },
    });
    if (!section) {
      section = await prisma.tableSection.create({
        data: { restaurantId, name: "Main", sortOrder: 0 },
      });
    }

    const maxSo = await prisma.table
      .aggregate({
        where: { tableSectionId: section.id },
        _max: { sortOrder: true },
      })
      .then((r) => r._max.sortOrder ?? -1);

    let order = maxSo + 1;
    for (const t of orphans) {
      await prisma.table.update({
        where: { id: t.id },
        data: { tableSectionId: section.id, sortOrder: order },
      });
      order += 1;
    }
    console.log(`Restaurant ${restaurantId}: assigned ${orphans.length} table(s) to section "${section.name}".`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
