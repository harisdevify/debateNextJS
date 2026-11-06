-- One immutable row per ended match. Intentionally excludes message/media and
-- any partner profile snapshots.
CREATE TYPE "DebateEndReason" AS ENUM ('COMPLETED', 'ENDED');

CREATE TABLE "debate_history" (
  "id" UUID NOT NULL,
  "first_user_id" INTEGER NOT NULL,
  "second_user_id" INTEGER NOT NULL,
  "topic" VARCHAR(40) NOT NULL,
  "language" VARCHAR(5) NOT NULL,
  "mode" VARCHAR(20) NOT NULL,
  "started_at" TIMESTAMPTZ NOT NULL,
  "ended_at" TIMESTAMPTZ NOT NULL,
  "end_reason" "DebateEndReason" NOT NULL,
  CONSTRAINT "debate_history_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "debate_history_first_user_id_ended_at_idx" ON "debate_history" ("first_user_id", "ended_at" DESC);
CREATE INDEX "debate_history_second_user_id_ended_at_idx" ON "debate_history" ("second_user_id", "ended_at" DESC);
ALTER TABLE "debate_history" ADD CONSTRAINT "debate_history_first_user_id_fkey" FOREIGN KEY ("first_user_id") REFERENCES "debate_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "debate_history" ADD CONSTRAINT "debate_history_second_user_id_fkey" FOREIGN KEY ("second_user_id") REFERENCES "debate_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
