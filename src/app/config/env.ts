import dotenv from "dotenv";
dotenv.config();

interface EnvConfig {
  DATABASE_URL: string;
  PORT: string;
  NODE_ENV: string;
  ADMIN_EMAIL: string;
  ADMIN_PASSWORD: string;
  
  ADMIN_PHONE?: string;
}

function getEnv(key: string) {
  const value = process.env[key];
  if (!value) throw new Error(`${key} env value not found`);
  return value;
}

const loadEnvVars = (): EnvConfig => ({ 
  DATABASE_URL: getEnv("DATABASE_URL"),
  PORT: getEnv("PORT"),
  NODE_ENV: getEnv("NODE_ENV"),
  ADMIN_EMAIL: getEnv("ADMIN_EMAIL"),
  ADMIN_PASSWORD: getEnv("ADMIN_PASSWORD"),
  ADMIN_PHONE: getEnv("ADMIN_PHONE"),
  
});

export const EnvVars = loadEnvVars();
