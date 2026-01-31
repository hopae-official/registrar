import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  await app.listen(process.env.PORT ?? 18000);
  console.log(`Server running on port ${await app.getUrl()}`);
}
bootstrap();
