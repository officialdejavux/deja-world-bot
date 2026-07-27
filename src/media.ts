import { existsSync } from "node:fs";
import { isAbsolute, resolve } from "node:path";
import { InputFile } from "grammy";

function localMediaPath(source: string): string | undefined {
  if (isAbsolute(source)) return source;
  if (source.startsWith("assets/") || source.startsWith("./") || source.startsWith("../")) {
    return resolve(process.cwd(), source);
  }
  return undefined;
}

export function isMediaSourceAvailable(source: string): boolean {
  const filePath = localMediaPath(source);
  return filePath ? existsSync(filePath) : true;
}

export function toTelegramInput(source: string): string | InputFile {
  const filePath = localMediaPath(source);
  if (!filePath) return source;
  if (!existsSync(filePath)) {
    throw new Error(`Missing local media asset: ${source}`);
  }
  return new InputFile(filePath);
}
