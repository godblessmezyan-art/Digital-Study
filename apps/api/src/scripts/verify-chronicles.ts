import { strict as assert } from 'node:assert';
import { PrismaClient } from '@prisma/client';
import { ChroniclesService } from '../chronicles/chronicles.service';
import { PrismaService } from '../prisma/prisma.service';

const ownerId = 'chronicles-verification-user';
const prisma = new PrismaClient();
const service = new ChroniclesService(prisma as PrismaService);

async function main() {
  await prisma.chronicleDiscovery.deleteMany({ where: { ownerId } });
  const initial = await service.list(ownerId);
  assert.equal(initial.total, 12);
  assert.equal(initial.discovered, 0);
  assert.equal(initial.entries[0].status, 'locked');

  const first = await service.checkTriggers(ownerId, { page: 'world', weather: 'clear', period: 'day' });
  assert.equal(first.discovered, true);
  assert.equal(first.entry?.id, 'season-01-record-001');
  const repeated = await service.checkTriggers(ownerId, { page: 'world', weather: 'clear', period: 'day' });
  assert.equal(repeated.discovered, false);

  await service.markRead(ownerId, 'season-01-record-001');
  assert.equal((await service.findOne(ownerId, 'season-01-record-001')).status, 'read');

  const second = await service.checkTriggers(ownerId, { page: 'journal', weather: 'clear', period: 'day' });
  assert.equal(second.entry?.id, 'season-01-record-002');
  const third = await service.checkTriggers(ownerId, { page: 'home', weather: 'rain', period: 'day' });
  assert.equal(third.entry?.id, 'season-01-record-003');

  const finalArchive = await service.list(ownerId);
  assert.equal(finalArchive.discovered, 3);
  assert.equal(finalArchive.read, 1);
  console.log('WORLD_CHRONICLES_CORE_OK');
}

main()
  .finally(async () => {
    await prisma.chronicleDiscovery.deleteMany({ where: { ownerId } });
    await prisma.$disconnect();
  })
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
