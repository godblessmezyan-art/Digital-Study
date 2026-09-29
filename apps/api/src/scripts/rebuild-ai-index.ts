import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { AiIndexService } from '../semantic/ai-index.service';

async function main() {
  const app = await NestFactory.createApplicationContext(AppModule, { logger: ['error', 'warn', 'log'] });
  try {
    const result = await app.get(AiIndexService).rebuildAll();
    console.log(JSON.stringify(result));
    if (result.failed > 0) process.exitCode = 1;
  } finally {
    await app.close();
  }
}

void main();
