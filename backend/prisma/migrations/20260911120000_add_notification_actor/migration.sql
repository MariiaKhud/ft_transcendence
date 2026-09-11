ALTER TABLE "notifications" ADD COLUMN "actor_id" TEXT;

-- For these types ref_id already held the acting user's id, so the actor is
-- recoverable. LIKE and COMMENT stored the article id instead, so their actor
-- is unrecoverable for existing rows and stays NULL.
UPDATE "notifications"
SET "actor_id" = "ref_id"
WHERE "ref_id" IS NOT NULL
  AND "type" IN ('FOLLOWED', 'FRIEND_REQUEST', 'FRIEND_ACCEPTED', 'MESSAGE', 'BADGE');
