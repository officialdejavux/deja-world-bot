import type { Context } from "grammy";
import { backToMenuKeyboard, roomKeyboard } from "./keyboards.js";
import { getUser, type Mood } from "./storage.js";

export type RoomKey =
  | "foyer"
  | "lounge"
  | "temple"
  | "vault"
  | "mirror"
  | "diary"
  | "concierge";

const roomMessages: Record<RoomKey, string[]> = {
  foyer: [
    "Enter Properly\n\nYou do not need every door. You need the right one. Start clean, stay respectful, and do not wander into fake pages pretending to be mine.",
    "Enter Properly\n\nThe door did not open because you knocked loudly. It opened because you came to the right place.",
    "Enter Properly\n\nNo fake links. No noisy promises. Just the official path, placed where you can reach it."
  ],
  lounge: [
    "Ask Correctly\n\nA good request does not mumble. It arrives clear, respectful, specific, and ready with a real budget.",
    "Ask Correctly\n\nVague desire is cheap. Clarity gets closer.",
    "Ask Correctly\n\nPrivate access is not automatic. Ask well, wait beautifully, and use the verified path."
  ],
  temple: [
    "Send Tribute\n\nAttention without action is just noise. If you want to be remembered, make it easy.",
    "Send Tribute\n\nA goddess notices intention when it arrives correctly. Gifts and tribute belong on the verified path.",
    "Send Tribute\n\nDo not perform devotion. Prove it cleanly."
  ],
  vault: [
    "Watch Me\n\nWatch what I chose to make official. If it is not verified, it does not deserve your trust.",
    "Watch Me\n\nThe right clip does not need to beg for your attention. It stays in your head quietly.",
    "Watch Me\n\nOfficial stores only. Anything else is noise wearing my name."
  ],
  mirror: [
    "Look Again\n\nA glimpse is enough when it is placed correctly.",
    "Look Again\n\nLook softly. Stay respectful. The point is not to collect me. It is to know where the real thing lives.",
    "Look Again\n\nPretty is easy. Control is the part you remember."
  ],
  diary: [
    "Get Closer\n\nPrivate updates are for people who know the difference between access and entitlement.",
    "Get Closer\n\nThe closer list is quieter. That is the point.",
    "Get Closer\n\nNo noise. No pretending. Just the updates worth knowing."
  ],
  concierge: [
    "Verify Me\n\nBefore you trust a link, make it earn trust. DivineDeja.com is the source.",
    "Verify Me\n\nIf someone sends you a page, a payment request, or a promise that is not verified, treat it like nothing.",
    "Verify Me\n\nClean access only. That is how the world stays mine."
  ]
};

const moodClosers: Record<Mood, string> = {
  experience: "Your tone: curious. I can work with that.",
  divine: "Your tone: devoted. Keep it useful.",
  balanced: "Your tone: polished. Good. Do not ruin it."
};

function getDayIndex(room: RoomKey, total: number, now = new Date()): number {
  const startOfYear = Date.UTC(now.getUTCFullYear(), 0, 1);
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const day = Math.floor((today - startOfYear) / 86_400_000);
  const roomOffset = room.length;
  return (day + roomOffset) % total;
}

export function getRoomMessage(room: RoomKey, mood: Mood = "balanced"): string {
  const messages = roomMessages[room];
  return `${messages[getDayIndex(room, messages.length)]}\n\n${moodClosers[mood]}`;
}

export async function sendMenu(ctx: Context): Promise<void> {
  await ctx.reply("Divine Deja\n\nBe honest about what you came for.", {
    reply_markup: roomKeyboard()
  });
}

export async function sendRoom(ctx: Context, room: RoomKey): Promise<void> {
  const user = ctx.from ? await getUser(ctx.from.id) : undefined;
  await ctx.reply(getRoomMessage(room, user?.mood), {
    reply_markup: backToMenuKeyboard()
  });
}

export function isRoomKey(value: string): value is RoomKey {
  return value in roomMessages;
}
