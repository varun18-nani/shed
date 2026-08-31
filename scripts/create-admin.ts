import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaClient } from "../lib/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
});

const prisma = new PrismaClient({
  adapter,
});

async function main() {
  const password = "Admin@123";

  const passwordHash = await bcrypt.hash(password, 10);

  const user = await prisma.user.create({
    data: {
      email: "admin@cvrmanagement.com",
      passwordHash,
      role: "ADMIN",
      firstName: "Admin",
      lastName: "User",
      phone: null,
      isActive: true,
    },
  });

  console.log("ADMIN CREATED");
  console.log("Email:", user.email);
  console.log("Password:", password);
}

main()
  .catch((error) => {
    console.error("ERROR:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });