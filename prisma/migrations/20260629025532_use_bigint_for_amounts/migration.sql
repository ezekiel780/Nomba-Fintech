-- AlterTable
ALTER TABLE "checkout_sessions" ALTER COLUMN "amount" SET DATA TYPE BIGINT;

-- AlterTable
ALTER TABLE "payouts" ALTER COLUMN "amount" SET DATA TYPE BIGINT;

-- AlterTable
ALTER TABLE "transactions" ALTER COLUMN "amount" SET DATA TYPE BIGINT,
ALTER COLUMN "amountExpected" SET DATA TYPE BIGINT;
