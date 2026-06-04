import "dotenv/config";
import dns from "dns";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";

const connectionString = `${process.env.DATABASE_URL}`;

const pool = new Pool({
  connectionString,
  // Force IPv4 at the socket level — bypasses Docker IPv6 routing issues
  lookup: (hostname, options, callback) => {
    dns.lookup(hostname, { ...options, family: 4 }, callback);
  },
});

const adapter = new PrismaPg(pool);
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