// src/server.ts
import { EnvVars } from "./app/config/env";
import app from "./app";
import { prisma } from "./shared/prisma";
import { seedAdmin } from "./shared/seedadmin";


const startServer = async () => {
  try {
    //  Prisma DB connection check
    await prisma.$connect();
    console.log(" Database connected successfully");
    await seedAdmin()
    
    app.listen(EnvVars.PORT, () => {
      console.log(`🚀 Server running on port ${EnvVars.PORT}`);
    });
  } catch (error: any) {
    console.error("❌ Server failed to start", error.message);
    process.exit(1);
  }
};

startServer();
