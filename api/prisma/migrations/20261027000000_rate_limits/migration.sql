CREATE TABLE "rate_limits" (
  "key" TEXT PRIMARY KEY,
  "count" INTEGER NOT NULL,
  "expires_at" TIMESTAMPTZ NOT NULL
);
CREATE INDEX "rate_limits_expires_at_idx" ON "rate_limits" ("expires_at");
CREATE INDEX "reports_reporter_id_created_at_idx" ON "reports" ("reporter_id", "created_at");
