import { ensureDefaultAdmin } from "./src/lib/db/users";

async function seed() {
  console.log("Starting database seed...");
  
  try {
    await ensureDefaultAdmin();
    console.log("✅ Default admin user created successfully");
    console.log("   Email: admin@noon.com");
    console.log("   Password: admin123");
  } catch (error) {
    console.error("❌ Error seeding database:", error);
    process.exit(1);
  }
}

seed();
