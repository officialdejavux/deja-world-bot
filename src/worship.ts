import type { Context } from "grammy";
import { backToMenuKeyboard } from "./keyboards.js";
import type { Mood } from "./storage.js";

const worshipMessages: Record<Mood, string[]> = {
  experience: [
    "Today's worship is honesty.\n\nAdmit what made you open this chat. Then choose the right path.",
    "Today's worship is attention.\n\nQuiet. Focused. Useful.",
    "Today's worship is restraint.\n\nLook without grabbing. Want without making noise."
  ],
  divine: [
    "Today's worship is usefulness.\n\nDesire is cheap until it does something.",
    "Today's worship is obedience with taste.\n\nFollow the official path. Do not get creative with my time.",
    "Today's worship is proof.\n\nIf you want to be remembered, make it easy."
  ],
  balanced: [
    "Today's worship is composure.\n\nNo messy entrances.",
    "Today's worship is clarity.\n\nKnow what you want before you ask.",
    "Today's worship is patience.\n\nThe right path opens cleaner than the rushed one."
  ]
};

function getDayIndex(total: number, now = new Date()): number {
  const startOfYear = Date.UTC(now.getUTCFullYear(), 0, 1);
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  return Math.floor((today - startOfYear) / 86_400_000) % total;
}

export function getTodaysWorship(mood: Mood = "balanced"): string {
  const messages = worshipMessages[mood] ?? worshipMessages.balanced;
  return messages[getDayIndex(messages.length)];
}

export async function sendTodaysWorship(ctx: Context, mood: Mood = "balanced"): Promise<void> {
  await ctx.reply(getTodaysWorship(mood), {
    reply_markup: backToMenuKeyboard()
  });
}
