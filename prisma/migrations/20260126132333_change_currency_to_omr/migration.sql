-- AlterTable
ALTER TABLE "bookings" ALTER COLUMN "currency" SET DEFAULT 'OMR';

-- AlterTable
ALTER TABLE "classes" ALTER COLUMN "currency" SET DEFAULT 'OMR';

-- AlterTable
ALTER TABLE "event_bookings" ALTER COLUMN "currency" SET DEFAULT 'OMR';

-- AlterTable
ALTER TABLE "wallets" ALTER COLUMN "currency" SET DEFAULT 'OMR';
