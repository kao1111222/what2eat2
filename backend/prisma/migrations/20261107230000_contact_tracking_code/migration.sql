ALTER TABLE "contact_messages"
ADD COLUMN "tracking_code_hash" CHAR(64);

CREATE UNIQUE INDEX "contact_messages_tracking_code_hash_key"
ON "contact_messages"("tracking_code_hash");
