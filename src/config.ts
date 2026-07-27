import { config as loadEnv } from "dotenv";

loadEnv();

function requiredEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`${name} is required. Add it to your .env file.`);
  }
  return value;
}

function optionalEnv(name: string, fallback = ""): string {
  return process.env[name]?.trim() || fallback;
}

function parseIdList(value: string): string[] {
  return value
    .split(",")
    .map((id) => id.trim())
    .filter((id) => /^\d+$/.test(id));
}

export const config = {
  botToken: requiredEnv("BOT_TOKEN"),
  botUsername: optionalEnv("BOT_USERNAME", "DejaWorldBot"),
  ownerTelegramUsername: optionalEnv("OWNER_TELEGRAM_USERNAME", "dejaxx_a"),
  ownerTelegramId: optionalEnv("OWNER_TELEGRAM_ID"),
  adminTelegramIds: Array.from(
    new Set([...parseIdList(optionalEnv("ADMIN_TELEGRAM_ID")), ...parseIdList(optionalEnv("ADMIN_TELEGRAM_IDS"))])
  )
};

export function isAdminTelegramId(id: number | string | undefined): boolean {
  if (id === undefined) return false;
  return config.adminTelegramIds.includes(String(id));
}
