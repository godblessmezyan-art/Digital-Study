import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  await prisma.category.upsert({
    where: { slug: 'uncategorized' },
    update: { name: '未分类' },
    create: { slug: 'uncategorized', name: '未分类' },
  });
}

main()
  .finally(async () => prisma.$disconnect())
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
