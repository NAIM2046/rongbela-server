import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

const connectionString = `${process.env.DATABASE_URL}`;

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

async function test() {
  try {
    const res = await prisma.$queryRaw`SELECT NOW()`;
    console.log("Connected to Neon:", res);
  } catch (err) {
    console.error("Failed to connect:", err);
  }
}

test();

export { prisma };