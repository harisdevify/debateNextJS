CREATE TYPE "UserRole" AS ENUM ('USER', 'ADMIN');
CREATE TYPE "AccountStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'BANNED');
CREATE TYPE "ModerationKind" AS ENUM ('DISMISS', 'WARN', 'SUSPEND', 'BAN', 'RESTORE');
ALTER TABLE "debate_users"
  ADD COLUMN "role" "UserRole" NOT NULL DEFAULT 'USER',
  ADD COLUMN "status" "AccountStatus" NOT NULL DEFAULT 'ACTIVE',
  ADD COLUMN "suspended_until" TIMESTAMPTZ;
CREATE TABLE "moderation_actions" (
  "id" SERIAL PRIMARY KEY,
  "actor_id" INTEGER NOT NULL REFERENCES "debate_users"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  "target_id" INTEGER NOT NULL REFERENCES "debate_users"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  "report_id" INTEGER REFERENCES "reports"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  "kind" "ModerationKind" NOT NULL,
  "reason" VARCHAR(1000) NOT NULL,
  "suspended_until" TIMESTAMPTZ,
  "previous_status" "AccountStatus" NOT NULL,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "moderation_actions_target_id_created_at_idx" ON "moderation_actions" ("target_id", "created_at");
CREATE INDEX "moderation_actions_report_id_idx" ON "moderation_actions" ("report_id");
