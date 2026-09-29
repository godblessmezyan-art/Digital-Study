import { Prisma, PrismaClient } from '@prisma/client';
import { seasonOneChronicles } from './seeds/chronicles';

const prisma = new PrismaClient();

async function main() {
  await prisma.category.upsert({
    where: { slug: 'uncategorized' },
    update: { name: '未分类' },
    create: { slug: 'uncategorized', name: '未分类' },
  });
  for (const chronicle of seasonOneChronicles) {
    const data = {
      ...chronicle,
      triggerConfig: chronicle.triggerConfig as Prisma.InputJsonValue,
      coordinates: chronicle.coordinates ?? Prisma.JsonNull,
    };
    await prisma.chronicleEntry.upsert({
      where: { id: chronicle.id },
      update: data,
      create: data,
    });
  }
}

main()
  .finally(async () => prisma.$disconnect())
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
