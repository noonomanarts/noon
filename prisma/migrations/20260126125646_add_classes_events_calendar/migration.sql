-- CreateEnum
CREATE TYPE "ClassCategory" AS ENUM ('COOKING', 'ARTS_CRAFTS');

-- CreateEnum
CREATE TYPE "ClassSubCategory" AS ENUM ('APPETIZERS_SNACKS', 'MAIN_DISHES', 'DESSERTS_BAKING', 'MOM_AND_KID', 'PAINTING', 'POTTERY', 'CRAFTS', 'MIXED');

-- CreateEnum
CREATE TYPE "ClassStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'CANCELLED', 'COMPLETED');

-- CreateEnum
CREATE TYPE "EventType" AS ENUM ('COOKING_COMPETITION', 'PRIVATE_CLASS', 'BIRTHDAY_PARTY');

-- CreateEnum
CREATE TYPE "EventStatus" AS ENUM ('NEW', 'IN_PROGRESS', 'PENDING_CLIENT_CONFIRMATION', 'CLIENT_CONFIRMED', 'PENDING_PAYMENT', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PackageType" AS ENUM ('STANDARD', 'PREMIUM');

-- CreateEnum
CREATE TYPE "BookingStatus" AS ENUM ('PENDING', 'CONFIRMED', 'CANCELLED', 'COMPLETED', 'NO_SHOW');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('ONLINE', 'BANK_TRANSFER', 'CASH', 'WALLET');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'PAID', 'REFUNDED', 'FAILED');

-- CreateEnum
CREATE TYPE "CalendarEventType" AS ENUM ('CLASS', 'PRIVATE_SESSION', 'COMPETITION', 'BIRTHDAY_PARTY', 'BLOCKED', 'CLEANING');

-- CreateTable
CREATE TABLE "trainer_profiles" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "bio" TEXT,
    "expertise" TEXT[],
    "experience" INTEGER,
    "socialLinks" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "trainer_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "classes" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "titleAr" TEXT,
    "description" TEXT NOT NULL,
    "descriptionAr" TEXT,
    "category" "ClassCategory" NOT NULL,
    "subCategory" "ClassSubCategory" NOT NULL,
    "image" TEXT,
    "images" TEXT[],
    "trainerId" TEXT NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'SAR',
    "seatsTotal" INTEGER NOT NULL,
    "seatsAvailable" INTEGER NOT NULL,
    "durationMinutes" INTEGER NOT NULL,
    "status" "ClassStatus" NOT NULL DEFAULT 'DRAFT',
    "metaTitle" TEXT,
    "metaDescription" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "publishedAt" TIMESTAMP(3),

    CONSTRAINT "classes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "class_sessions" (
    "id" TEXT NOT NULL,
    "classId" TEXT NOT NULL,
    "startDateTime" TIMESTAMP(3) NOT NULL,
    "endDateTime" TIMESTAMP(3) NOT NULL,
    "seatsTotal" INTEGER,
    "seatsBooked" INTEGER NOT NULL DEFAULT 0,
    "isCancelled" BOOLEAN NOT NULL DEFAULT false,
    "cancellationReason" TEXT,
    "recipeSubmitted" BOOLEAN NOT NULL DEFAULT false,
    "recipePDF" TEXT,
    "groceryList" TEXT,
    "workshopBrief" TEXT,
    "photos" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "class_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bookings" (
    "id" TEXT NOT NULL,
    "bookingNumber" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "classId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "participants" JSONB NOT NULL,
    "numberOfParticipants" INTEGER NOT NULL,
    "totalAmount" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'SAR',
    "status" "BookingStatus" NOT NULL DEFAULT 'PENDING',
    "paymentMethod" "PaymentMethod",
    "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "paidAt" TIMESTAMP(3),
    "termsAccepted" BOOLEAN NOT NULL DEFAULT false,
    "termsAcceptedAt" TIMESTAMP(3),
    "specialRequests" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bookings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "event_bookings" (
    "id" TEXT NOT NULL,
    "bookingNumber" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "eventType" "EventType" NOT NULL,
    "selectedDate" TIMESTAMP(3) NOT NULL,
    "selectedTime" TEXT NOT NULL,
    "packageType" "PackageType",
    "numberOfParticipants" INTEGER NOT NULL,
    "numberOfGroups" INTEGER,
    "gifts" JSONB,
    "fullName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phoneNumber" TEXT NOT NULL,
    "companyOrGroupName" TEXT,
    "preferredDish" TEXT,
    "specialRequests" TEXT,
    "status" "EventStatus" NOT NULL DEFAULT 'NEW',
    "clientConfirmed" BOOLEAN NOT NULL DEFAULT false,
    "clientConfirmedAt" TIMESTAMP(3),
    "digitalSignature" TEXT,
    "agreementAccepted" BOOLEAN NOT NULL DEFAULT false,
    "totalAmount" DOUBLE PRECISION,
    "currency" TEXT NOT NULL DEFAULT 'SAR',
    "paymentMethod" "PaymentMethod",
    "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "paidAt" TIMESTAMP(3),
    "paymentProof" TEXT,
    "adminNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "event_bookings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "calendar_events" (
    "id" TEXT NOT NULL,
    "type" "CalendarEventType" NOT NULL,
    "startDateTime" TIMESTAMP(3) NOT NULL,
    "endDateTime" TIMESTAMP(3) NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "classSessionId" TEXT,
    "eventBookingId" TEXT,
    "isBlocked" BOOLEAN NOT NULL DEFAULT false,
    "blockReason" TEXT,
    "internalNotes" TEXT,
    "visibleToTrainers" BOOLEAN NOT NULL DEFAULT false,
    "visibleTrainerIds" TEXT[],
    "color" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "calendar_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reviews" (
    "id" TEXT NOT NULL,
    "classId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    "isApproved" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wallets" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "balance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'SAR',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "wallets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wallet_transactions" (
    "id" TEXT NOT NULL,
    "walletId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "type" TEXT NOT NULL,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "wallet_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "loyalty_cards" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "points" INTEGER NOT NULL DEFAULT 0,
    "stamps" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "loyalty_cards_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "trainer_profiles_userId_key" ON "trainer_profiles"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "classes_slug_key" ON "classes"("slug");

-- CreateIndex
CREATE INDEX "classes_slug_idx" ON "classes"("slug");

-- CreateIndex
CREATE INDEX "classes_category_idx" ON "classes"("category");

-- CreateIndex
CREATE INDEX "classes_subCategory_idx" ON "classes"("subCategory");

-- CreateIndex
CREATE INDEX "classes_status_idx" ON "classes"("status");

-- CreateIndex
CREATE INDEX "classes_trainerId_idx" ON "classes"("trainerId");

-- CreateIndex
CREATE INDEX "class_sessions_classId_idx" ON "class_sessions"("classId");

-- CreateIndex
CREATE INDEX "class_sessions_startDateTime_idx" ON "class_sessions"("startDateTime");

-- CreateIndex
CREATE UNIQUE INDEX "bookings_bookingNumber_key" ON "bookings"("bookingNumber");

-- CreateIndex
CREATE INDEX "bookings_userId_idx" ON "bookings"("userId");

-- CreateIndex
CREATE INDEX "bookings_classId_idx" ON "bookings"("classId");

-- CreateIndex
CREATE INDEX "bookings_sessionId_idx" ON "bookings"("sessionId");

-- CreateIndex
CREATE INDEX "bookings_status_idx" ON "bookings"("status");

-- CreateIndex
CREATE INDEX "bookings_bookingNumber_idx" ON "bookings"("bookingNumber");

-- CreateIndex
CREATE UNIQUE INDEX "event_bookings_bookingNumber_key" ON "event_bookings"("bookingNumber");

-- CreateIndex
CREATE INDEX "event_bookings_userId_idx" ON "event_bookings"("userId");

-- CreateIndex
CREATE INDEX "event_bookings_eventType_idx" ON "event_bookings"("eventType");

-- CreateIndex
CREATE INDEX "event_bookings_status_idx" ON "event_bookings"("status");

-- CreateIndex
CREATE INDEX "event_bookings_bookingNumber_idx" ON "event_bookings"("bookingNumber");

-- CreateIndex
CREATE UNIQUE INDEX "calendar_events_classSessionId_key" ON "calendar_events"("classSessionId");

-- CreateIndex
CREATE UNIQUE INDEX "calendar_events_eventBookingId_key" ON "calendar_events"("eventBookingId");

-- CreateIndex
CREATE INDEX "calendar_events_type_idx" ON "calendar_events"("type");

-- CreateIndex
CREATE INDEX "calendar_events_startDateTime_idx" ON "calendar_events"("startDateTime");

-- CreateIndex
CREATE INDEX "calendar_events_endDateTime_idx" ON "calendar_events"("endDateTime");

-- CreateIndex
CREATE INDEX "reviews_classId_idx" ON "reviews"("classId");

-- CreateIndex
CREATE INDEX "reviews_userId_idx" ON "reviews"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "wallets_userId_key" ON "wallets"("userId");

-- CreateIndex
CREATE INDEX "wallet_transactions_walletId_idx" ON "wallet_transactions"("walletId");

-- CreateIndex
CREATE UNIQUE INDEX "loyalty_cards_userId_key" ON "loyalty_cards"("userId");

-- AddForeignKey
ALTER TABLE "classes" ADD CONSTRAINT "classes_trainerId_fkey" FOREIGN KEY ("trainerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "class_sessions" ADD CONSTRAINT "class_sessions_classId_fkey" FOREIGN KEY ("classId") REFERENCES "classes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_classId_fkey" FOREIGN KEY ("classId") REFERENCES "classes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "class_sessions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_bookings" ADD CONSTRAINT "event_bookings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calendar_events" ADD CONSTRAINT "calendar_events_classSessionId_fkey" FOREIGN KEY ("classSessionId") REFERENCES "class_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calendar_events" ADD CONSTRAINT "calendar_events_eventBookingId_fkey" FOREIGN KEY ("eventBookingId") REFERENCES "event_bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_classId_fkey" FOREIGN KEY ("classId") REFERENCES "classes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wallets" ADD CONSTRAINT "wallets_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wallet_transactions" ADD CONSTRAINT "wallet_transactions_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "wallets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "loyalty_cards" ADD CONSTRAINT "loyalty_cards_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
