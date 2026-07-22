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

function optionalBooleanEnv(name: string, fallback = false): boolean {
  const value = process.env[name]?.trim().toLowerCase();
  if (!value) return fallback;
  return ["1", "true", "yes", "on"].includes(value);
}

function optionalPort(name: string): number | undefined {
  const raw = process.env[name]?.trim();
  if (!raw) return undefined;
  const port = Number(raw);
  return Number.isInteger(port) && port > 0 && port <= 65535 ? port : undefined;
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
  ),
  port: optionalPort("PORT"),
  stripeCheckoutEnabled: optionalBooleanEnv("STRIPE_CHECKOUT_ENABLED", false),
  stripeSecretKey: optionalEnv("STRIPE_SECRET_KEY"),
  stripeWebhookSecret: optionalEnv("STRIPE_WEBHOOK_SECRET"),
  stripeWebhookPath: optionalEnv("STRIPE_WEBHOOK_PATH", "/stripe/webhook"),
  stripeSuccessUrl: optionalEnv("STRIPE_SUCCESS_URL"),
  stripeCancelUrl: optionalEnv("STRIPE_CANCEL_URL")
};

export function isAdminTelegramId(id: number | string | undefined): boolean {
  if (id === undefined) return false;
  return config.adminTelegramIds.includes(String(id));
}
