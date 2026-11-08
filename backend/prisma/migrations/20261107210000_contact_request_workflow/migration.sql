ALTER TABLE "contact_messages"
ADD COLUMN "attachment_filename" VARCHAR(100),
ADD COLUMN "admin_reply" TEXT,
ADD COLUMN "replied_at" TIMESTAMP(6),
ADD COLUMN "reply_email_sent_at" TIMESTAMP(6);

ALTER TABLE "contact_messages"
DROP CONSTRAINT IF EXISTS "contact_messages_status_check";

UPDATE "contact_messages"
SET "status" = CASE "status"
    WHEN 'new' THEN 'pending'
    WHEN 'read' THEN 'investigating'
    WHEN 'replied' THEN 'resolved'
    ELSE "status"
END
WHERE "status" IN ('new', 'read', 'replied');

ALTER TABLE "contact_messages"
ALTER COLUMN "status" SET DEFAULT 'pending',
ADD CONSTRAINT "contact_messages_status_check"
CHECK ("status" IN ('pending', 'investigating', 'resolved', 'closed'));
