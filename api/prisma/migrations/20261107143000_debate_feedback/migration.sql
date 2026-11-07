CREATE TABLE "debate_feedback" (
  "id" SERIAL NOT NULL,
  "debate_id" UUID NOT NULL,
  "rater_id" INTEGER NOT NULL,
  "recipient_id" INTEGER NOT NULL,
  "rating" SMALLINT NOT NULL,
  "comment" VARCHAR(500),
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "debate_feedback_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "debate_feedback_rating_check" CHECK ("rating" BETWEEN 1 AND 5)
);
CREATE UNIQUE INDEX "debate_feedback_debate_id_rater_id_key" ON "debate_feedback"("debate_id", "rater_id");
CREATE INDEX "debate_feedback_recipient_id_created_at_idx" ON "debate_feedback"("recipient_id", "created_at");
ALTER TABLE "debate_feedback" ADD CONSTRAINT "debate_feedback_debate_id_fkey" FOREIGN KEY ("debate_id") REFERENCES "debate_history"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "debate_feedback" ADD CONSTRAINT "debate_feedback_rater_id_fkey" FOREIGN KEY ("rater_id") REFERENCES "debate_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "debate_feedback" ADD CONSTRAINT "debate_feedback_recipient_id_fkey" FOREIGN KEY ("recipient_id") REFERENCES "debate_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
