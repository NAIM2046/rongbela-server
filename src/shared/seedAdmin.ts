import { Role } from "@prisma/client";
import { EnvVars } from "../app/config/env";
import { prisma } from "./prisma";
import bcrypt from "bcrypt";

export const seedAdmin = async () => {
  try {
    const existingAdmin = await prisma.user.findFirst({
      where: { role: "ADMIN" },
    });
    // console.log("Existing admin user:", existingAdmin);
    if (existingAdmin) {
      console.log("Admin user already exists. Skipping seeding.");
      return;
    }

    const hashPassword = await bcrypt.hash(EnvVars.ADMIN_PASSWORD, 10);

    const adminData = {
      name: "Next Innovation Labs",
      email: EnvVars.ADMIN_EMAIL,
      role: Role.ADMIN,
      password: hashPassword,
      
      phone: EnvVars.ADMIN_PHONE as string ,
    };

    const adminUser = await prisma.user.create({
      data: adminData,
    });
    console.log("Admin user seeded successfully:", adminUser);
  } catch (error) {
    console.error("Error seeding admin user:", error);
  }
};
