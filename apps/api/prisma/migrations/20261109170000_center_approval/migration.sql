ALTER TYPE "CenterStatus" ADD VALUE 'PENDING_APPROVAL';
ALTER TYPE "CenterStatus" ADD VALUE 'REJECTED';

ALTER TABLE "centers" ADD COLUMN "rejection_reason" TEXT;
ALTER TABLE "centers" ADD COLUMN "reviewed_at" TIMESTAMP(3);
ALTER TABLE "centers" ADD COLUMN "reviewed_by_user_id" UUID;

ALTER TABLE "centers"
  ADD CONSTRAINT "centers_reviewed_by_user_id_fkey"
  FOREIGN KEY ("reviewed_by_user_id") REFERENCES "users"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
