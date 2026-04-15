import { prisma } from "@/lib/prisma";

/** Assigns tables with no section to "Main" (creating it if needed). Safe to call on every GET. */
export async function ensureRestaurantTablesHaveSections(restaurantId: string) {
  const orphans = await prisma.table.findMany({
    where: { restaurantId, tableSectionId: null },
  });
  if (orphans.length === 0) return;

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
}
