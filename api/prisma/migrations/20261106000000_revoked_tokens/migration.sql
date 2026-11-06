CREATE TABLE "revoked_tokens" (
    "token_hash" VARCHAR(64) NOT NULL,
    "user_id" INTEGER NOT NULL,
    "expires_at" TIMESTAMPTZ NOT NULL,
    CONSTRAINT "revoked_tokens_pkey" PRIMARY KEY ("token_hash")
);
CREATE INDEX "revoked_tokens_expires_at_idx" ON "revoked_tokens"("expires_at");
ALTER TABLE "revoked_tokens" ADD CONSTRAINT "revoked_tokens_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "debate_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
