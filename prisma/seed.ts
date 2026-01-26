import { ensureDefaultAdmin } from "../src/lib/db/users";
import { PrismaClient } from "../src/generated/prisma";

const prisma = new PrismaClient();

async function seed() {
  console.log("Starting database seed...");
  
  try {
    await ensureDefaultAdmin();
    console.log("✅ Default admin user created successfully");
    console.log("   Email: admin@noon.com");
    console.log("   Password: admin123");

    // Create a trainer user
    const bcrypt = await import("bcryptjs");
    const hashedPassword = await bcrypt.hash("trainer123", 10);

    const trainer = await prisma.user.upsert({
      where: { email: "trainer@noon.com" },
      update: {},
      create: {
        email: "trainer@noon.com",
        password: hashedPassword,
        fullName: "Chef Sarah Ahmed",
        phoneNumber: "+966501234567",
        role: "TRAINER",
        status: "ACTIVE",
        preferredLanguage: "ENGLISH",
      },
    });

    console.log("✅ Trainer user created");

    // Create sample cooking classes
    const cookingClass = await prisma.class.upsert({
      where: { slug: "italian-pasta-making" },
      update: {},
      create: {
        slug: "italian-pasta-making",
        title: "Italian Pasta Making Masterclass",
        titleAr: "دورة صنع المعكرونة الإيطالية",
        description:
          "Learn the art of making authentic Italian pasta from scratch. We'll cover different pasta shapes, sauces, and techniques used by professional chefs in Italy.",
        descriptionAr:
          "تعلم فن صنع المعكرونة الإيطالية الأصيلة من الصفر. سنغطي أشكال المعكرونة المختلفة والصلصات والتقنيات التي يستخدمها الطهاة المحترفون في إيطاليا.",
        category: "COOKING",
        subCategory: "MAIN_DISHES",
        trainerId: trainer.id,
        price: 25,
        currency: "OMR",
        seatsTotal: 12,
        seatsAvailable: 12,
        durationMinutes: 180,
        status: "PUBLISHED",
        publishedAt: new Date(),
      },
    });

    console.log("✅ Sample cooking class created");

    // Create a session for the class
    const sessionDate = new Date();
    sessionDate.setDate(sessionDate.getDate() + 7); // 7 days from now
    sessionDate.setHours(18, 0, 0, 0);

    const endDate = new Date(sessionDate);
    endDate.setHours(21, 0, 0, 0);

    const session = await prisma.classSession.create({
      data: {
        classId: cookingClass.id,
        startDateTime: sessionDate,
        endDateTime: endDate,
        seatsTotal: 12,
      },
    });

    console.log("✅ Sample class session created");

    // Create calendar event
    await prisma.calendarEvent.create({
      data: {
        type: "CLASS",
        startDateTime: sessionDate,
        endDateTime: endDate,
        title: cookingClass.title,
        description: cookingClass.description,
        classSessionId: session.id,
      },
    });

    // Add cleaning block
    const cleaningStart = new Date(endDate);
    const cleaningEnd = new Date(cleaningStart);
    cleaningEnd.setHours(cleaningEnd.getHours() + 3);

    await prisma.calendarEvent.create({
      data: {
        type: "CLEANING",
        startDateTime: cleaningStart,
        endDateTime: cleaningEnd,
        title: "Cleaning - Italian Pasta Making",
        isBlocked: true,
        blockReason: "Post-cooking class cleaning",
      },
    });

    console.log("✅ Calendar events created");

    // Create Arts & Crafts class
    await prisma.class.upsert({
      where: { slug: "pottery-workshop" },
      update: {},
      create: {
        slug: "pottery-workshop",
        title: "Pottery Workshop for Beginners",
        titleAr: "ورشة الفخار للمبتدئين",
        description:
          "Discover the joy of working with clay. Learn basic pottery techniques including hand-building and wheel throwing to create beautiful ceramic pieces.",
        descriptionAr:
          "اكتشف متعة العمل مع الطين. تعلم تقنيات الفخار الأساسية بما في ذلك البناء اليدوي والدوران على العجلة لإنشاء قطع خزفية جميلة.",
        category: "ARTS_CRAFTS",
        subCategory: "POTTERY",
        trainerId: trainer.id,
        price: 20,
        currency: "OMR",
        seatsTotal: 8,
        seatsAvailable: 8,
        durationMinutes: 150,
        status: "PUBLISHED",
        publishedAt: new Date(),
      },
    });

    console.log("✅ Sample arts & crafts class created");

    console.log("\n✅ Database seeding completed successfully!");
  } catch (error) {
    console.error("❌ Error seeding database:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

seed();
