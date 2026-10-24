CREATE TABLE "debate_users" (
    "id" SERIAL NOT NULL,
    "fullname" VARCHAR(100) NOT NULL,
    "email" VARCHAR(150) NOT NULL,
    "gender" VARCHAR(20) NOT NULL,
    "education" VARCHAR(100) NOT NULL,
    "country" VARCHAR(100) NOT NULL,
    "password" VARCHAR(255) NOT NULL,
    "created_at" TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "debate_users_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "debate_users_email_key" ON "debate_users"("email");
