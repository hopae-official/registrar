/**
 * Must be imported first
 * Tracing: https://docs.opentelemetry.io/getting-started/nodejs
 */
import './tracing';

import { NestFactory } from '@nestjs/core';
import {
  NestFastifyApplication,
  FastifyAdapter,
} from '@nestjs/platform-fastify';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { Logger } from 'nestjs-pino';
import { AppModule } from './app.module';
import type { FastifyRequest, FastifyReply } from 'fastify';
import type { IncomingMessage, ServerResponse } from 'node:http';

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter(),
    { bufferLogs: true },
  );
  app.useLogger(app.get(Logger));

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

  // Attach parsed body to raw objects so pino-http serializers can access them
  const fastify = app.getHttpAdapter().getInstance();
  fastify.addHook(
    'preHandler',
    (request: FastifyRequest, _reply: FastifyReply, done: () => void) => {
      (request.raw as IncomingMessage & { body?: unknown }).body = request.body;
      done();
    },
  );
  fastify.addHook(
    'preSerialization',
    (
      _request: FastifyRequest,
      reply: FastifyReply,
      payload: unknown,
      done: (err: null, payload: unknown) => void,
    ) => {
      (reply.raw as ServerResponse & { body?: unknown }).body = payload;
      done(null, payload);
    },
  );

  app.enableCors();
  const port = process.env.PORT ?? 18000;
  await app.listen(port, '0.0.0.0');
  const logger = app.get(Logger);
  logger.log(`Server running on ${await app.getUrl()}`, 'Bootstrap');
}
void bootstrap();
