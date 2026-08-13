-- AlterTable
ALTER TABLE "Message" ADD COLUMN     "followUps" JSONB,
ADD COLUMN     "sources" JSONB;

-- AlterTable
ALTER TABLE "user" ADD COLUMN     "credits" INTEGER NOT NULL DEFAULT 100;
