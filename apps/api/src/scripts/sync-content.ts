import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { ContentService } from '../content/content.service';

async function main() {
  const app = await NestFactory.createApplicationContext(AppModule, { logger: ['error', 'warn'] });
  try {
    const result = await app.get(ContentService).syncAll();
    console.log(`Synced ${result.synced}/${result.scanned} books: ${result.slugs.join(', ') || '(none)'}`);
  } finally {
    await app.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
