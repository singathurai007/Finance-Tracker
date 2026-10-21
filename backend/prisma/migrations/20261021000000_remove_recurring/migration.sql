-- DropForeignKey
ALTER TABLE "RecurringTransaction" DROP CONSTRAINT "RecurringTransaction_accountId_fkey";

-- DropForeignKey
ALTER TABLE "RecurringTransaction" DROP CONSTRAINT "RecurringTransaction_categoryId_fkey";

-- DropTable
DROP TABLE "RecurringTransaction";

-- DropEnum
DROP TYPE "Frequency";
