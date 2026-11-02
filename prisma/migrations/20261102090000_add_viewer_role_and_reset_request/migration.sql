-- AlterEnum: read-only role for review accounts
ALTER TYPE "Role" ADD VALUE 'VIEWER';

-- AlterTable: admin-mediated "Forgot password" requests
ALTER TABLE "User" ADD COLUMN "passwordResetRequestedAt" TIMESTAMP(3);
