import { Module, Global, Inject, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { drizzle, type PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

export const DRIZZLE = Symbol('DRIZZLE');
export type DrizzleDb = PostgresJsDatabase<typeof schema>;

/**
 * Postgres (postgres.js) via Drizzle, from `DATABASE_URL`. Schema applied with drizzle-kit migrations
 * (`drizzle.config.ts` → `drizzle/`, run by `src/migrate.ts` / `pnpm migrate`) as a deploy step / Job.
 */
@Global()
@Module({
  providers: [
    {
      provide: DRIZZLE,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const client = postgres(config.getOrThrow<string>('DATABASE_URL'));
        return Object.assign(drizzle(client, { schema }), { $client: client });
      },
    },
  ],
  exports: [DRIZZLE],
})
export class DrizzleModule implements OnModuleDestroy {
  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDb & { $client: postgres.Sql },
  ) {}

  async onModuleDestroy() {
    await this.db.$client.end();
  }
}
