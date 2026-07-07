import { existsSync } from "node:fs";
import { InputFile } from "grammy";

export function toTelegramInput(source: string): string | InputFile {
  return existsSync(source) ? new InputFile(source) : source;
}
