import { Inject, Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DRIZZLE, type DrizzleDb } from '../../db/drizzle.module';
import { wrprcStatus } from '../../db/schema';
import { CryptoService } from '../crypto/crypto.service';
import {
  STATUS_INVALID,
  STATUS_LIST_ID,
  STATUS_VALID,
  encodeStatusList,
  statusListUri,
} from './status-list.codec';

const STATUS_LIST_TTL = 3600; // §5.1 `ttl` — how long a consumer may cache the list
const MIN_ENTRIES = 256; // capacity padding so fresh indices are in-bounds

/**
 * IETF Token Status List for issued WRPRCs (ETSI TS 119 475 Table 7 `status`). One bit per WRPRC:
 * 0 = valid, 1 = revoked. The bit index is a Postgres identity column allocated at issuance time.
 */
@Injectable()
export class StatusListService {
  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDb,
    private readonly crypto: CryptoService,
  ) {}

  private get issuer(): string {
    return this.crypto.issuer;
  }

  uri(id: string = STATUS_LIST_ID): string {
    return statusListUri(this.issuer, id);
  }

  /** Allocate a status-list index for a freshly issued WRPRC and return its `status` reference. */
  async recordIssuance(jti: string): Promise<{ idx: number; uri: string }> {
    const [row] = await this.db
      .insert(wrprcStatus)
      .values({ jti })
      .returning({ statusIdx: wrprcStatus.statusIdx });
    return { idx: row.statusIdx, uri: this.uri() };
  }

  /** Build + sign the Status List Token for the given list id. */
  async statusListToken(id: string = STATUS_LIST_ID): Promise<string> {
    const rows = await this.db
      .select({ idx: wrprcStatus.statusIdx, revoked: wrprcStatus.revoked })
      .from(wrprcStatus);
    const statusList = encodeStatusList(
      rows.map((r) => ({
        idx: r.idx,
        status: r.revoked ? STATUS_INVALID : STATUS_VALID,
      })),
      1,
      MIN_ENTRIES,
    );
    return this.crypto.signStatusList(
      statusList,
      this.uri(id),
      STATUS_LIST_TTL,
    );
  }

  /** Flip a WRPRC to INVALID (revoked) by its jti. Returns false if unknown. */
  async revoke(jti: string): Promise<boolean> {
    const res = await this.db
      .update(wrprcStatus)
      .set({ revoked: true, revokedAt: new Date() })
      .where(eq(wrprcStatus.jti, jti))
      .returning({ jti: wrprcStatus.jti });
    return res.length > 0;
  }
}
