import dotenv from "dotenv";

dotenv.config();

export const env = {
    PORT: process.env.PORT || 3001,
    JWT_SECRET: (process.env.JWT_SECRET || "default-secret") as string,
    CORS_ORIGIN: (process.env.CORS_ORIGIN || "http://localhost:5173") as string,
    DATABASE_URL: (process.env.DATABASE_URL || "file:./dev.db") as string,
    NODE_ENV: (process.env.NODE_ENV || "development") as string,
};
