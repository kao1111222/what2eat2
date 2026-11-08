ALTER TABLE "contact_messages"
ADD COLUMN "tracking_recovery_hash" CHAR(64),
ADD COLUMN "tracking_recovery_expires_at" TIMESTAMP(6);

CREATE UNIQUE INDEX "contact_messages_tracking_recovery_hash_key"
ON "contact_messages"("tracking_recovery_hash");
