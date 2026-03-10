import { NestFactory } from '@nestjs/core';
import {
  NestFastifyApplication,
  FastifyAdapter,
} from '@nestjs/platform-fastify';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter(),
  );

  const config = new DocumentBuilder()
    .setTitle('Registrar API')
    .setDescription(
      'Wallet-Relying Party Registration API based on EU ARF TS5/TS6 specifications',
    )
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  app.enableCors();
  const port = process.env.PORT ?? 18000;
  await app.listen(port, '0.0.0.0');
  console.log(`Server running on ${await app.getUrl()}`);
}
bootstrap();
