import { Injectable } from "@nestjs/common";
import { createHash } from "node:crypto";
import { PrismaService } from "../prisma/prisma.service";

/** Atomic fixed-window quotas shared across API processes and socket reconnects. */
@Injectable()
export class RateLimitService {
  private nextCleanup = 0;
  constructor(private readonly prisma: PrismaService) {}

  async allow(
    scope: string,
    identity: string,
    limit: number,
    windowMs: number,
  ) {
    const key = `${scope}:${createHash("sha256").update(identity).digest("hex")}`;
    const rows = await this.prisma.$queryRaw<Array<{ count: number }>>`
      INSERT INTO "rate_limits" ("key", "count", "expires_at")
      VALUES (${key}, 1, NOW() + ${windowMs} * INTERVAL '1 millisecond')
      ON CONFLICT ("key") DO UPDATE SET
        "count" = CASE WHEN "rate_limits"."expires_at" <= NOW() THEN 1 ELSE LEAST("rate_limits"."count" + 1, ${limit + 1}) END,
        "expires_at" = CASE WHEN "rate_limits"."expires_at" <= NOW()
          THEN NOW() + ${windowMs} * INTERVAL '1 millisecond' ELSE "rate_limits"."expires_at" END
      RETURNING "count"
    `;
    if (Date.now() >= this.nextCleanup) {
      this.nextCleanup = Date.now() + 60_000;
      // Expired identities must not accumulate forever. Cleanup is not on the request path.
      void this.prisma
        .$executeRaw`DELETE FROM "rate_limits" WHERE "expires_at" < NOW()`.catch(
        () => {
          this.nextCleanup = 0;
        },
      );
    }
    return rows[0].count <= limit;
  }
}
