import {
  pgTable,
  uuid,
  varchar,
  boolean,
  jsonb,
  timestamp,
  integer,
} from 'drizzle-orm/pg-core';
import { randomUUID } from 'node:crypto';
import type { WalletRelyingParty } from '../modules/relying_party/relying_party.dto';

/**
 * Wallet Relying Parties (and intermediaries / mediated RPs). The whole record — including its nested access
 * and registration certificates — is stored in `data` (JSONB); `owner_id` and `is_intermediary` are lifted
 * into columns for the common filters. This table is the source of truth (the service reads/writes it directly).
 */
export const relyingParties = pgTable('relying_parties', {
  id: uuid('id').primaryKey(),
  ownerId: uuid('owner_id').notNull(),
  isIntermediary: boolean('is_intermediary').notNull().default(false),
  data: jsonb('data').$type<WalletRelyingParty>().notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

/**
 * One row per issued WRPRC, backing the IETF Token Status List served at /status-lists/1.
 * `status_idx` (a Postgres identity column) is the bit index embedded as `status.status_list.idx`
 * in the WRPRC; revocation flips `revoked`.
 */
export const wrprcStatus = pgTable('wrprc_status', {
  jti: uuid('jti').primaryKey(),
  statusIdx: integer('status_idx').generatedByDefaultAsIdentity().notNull(),
  revoked: boolean('revoked').notNull().default(false),
  revokedAt: timestamp('revoked_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

/** Portal accounts (owners of RPs). */
export const users = pgTable('users', {
  id: uuid('id')
    .primaryKey()
    .$defaultFn(() => randomUUID()),
  email: varchar('email', { length: 320 }).notNull().unique(),
  name: varchar('name', { length: 200 }),
  company: varchar('company', { length: 200 }),
  password: varchar('password', { length: 200 }).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});
