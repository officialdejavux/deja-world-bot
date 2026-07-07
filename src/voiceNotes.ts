import { InlineKeyboard, type Context } from "grammy";
import { futureVoiceNoteItems } from "./editLater.js";
import { toTelegramInput } from "./media.js";
import { logEvent, setUserMemory } from "./storage.js";

export type VoiceNoteItem = {
  audioSource: string;
  title?: string;
  caption?: string;
  date?: string;
};

export type VoiceNoteCategory = {
  key: string;
  label: string;
  items: VoiceNoteItem[];
};

export const voiceNoteCategories: VoiceNoteCategory[] = [
  {
    key: "good_morning",
    label: "Good Morning From Me",
    items: [
      ...futureVoiceNoteItems
    ]
  },
  {
    key: "miss_me",
    label: "Listen When You Miss Me",
    items: [
      {
        audioSource: "assets/voice/miss-me-boys.m4a"
      }
    ]
  },
  {
    key: "instructions",
    label: "Goddess Instructions",
    items: []
  },
  {
    key: "girlfriend",
    label: "Sweet Girlfriend Notes",
    items: []
  },
  {
    key: "after_hours",
    label: "After Hours Audio",
    items: [
      {
        audioSource: "assets/voice/stroke-for-purpose.mp3"
      }
    ]
  }
];

function voiceNotesKeyboard(): InlineKeyboard {
  const keyboard = new InlineKeyboard();

  voiceNoteCategories.forEach((category) => {
    keyboard.text(category.label, `VOICE_CATEGORY_${category.key}`).row();
  });

  keyboard.text("Back to Menu", "MENU");
  return keyboard;
}

function voiceNoteItemKeyboard(category: VoiceNoteCategory): InlineKeyboard {
  return new InlineKeyboard()
    .text("Back to Voice Notes", "VOICE_NOTES")
    .row()
    .text("Gifts & Considerations", "WORLD_GIFTS")
    .text("Private Access", "WORLD_PRIVATE")
    .row()
    .text("Main Menu", "MENU");
}

function voiceNoteCaption(item: VoiceNoteItem): string | undefined {
  return [item.title, item.date, item.caption].filter(Boolean).join("\n\n") || undefined;
}

function getCategory(categoryKey: string): VoiceNoteCategory | undefined {
  return voiceNoteCategories.find((category) => category.key === categoryKey);
}

export async function sendVoiceNotes(ctx: Context): Promise<void> {
  await logEvent("voice_notes_opened", { userId: ctx.from?.id });
  await ctx.reply(
    "Some things feel better when you hear them from me.\n\nChoose what kind of voice note you want waiting for you.",
    {
      reply_markup: voiceNotesKeyboard()
    }
  );
}

export async function sendVoiceCategory(ctx: Context, categoryKey: string): Promise<void> {
  const category = getCategory(categoryKey);
  if (ctx.from) {
    await setUserMemory(ctx.from.id, { lastVoiceNoteCategory: categoryKey, lastRoomVisited: "Voice Notes" });
  }

  if (!category || category.items.length === 0) {
    await ctx.reply(
      "This voice note is still being prepared. Come back soon — I like giving you something to wait for.",
      {
        reply_markup: new InlineKeyboard()
          .text("Back to Voice Notes", "VOICE_NOTES")
          .row()
          .text("Gifts & Considerations", "WORLD_GIFTS")
          .text("Private Access", "WORLD_PRIVATE")
          .row()
          .text("Main Menu", "MENU")
      }
    );
    return;
  }

  await sendVoiceNoteItem(ctx, category.key, 0);
}

export async function sendVoiceNoteItem(ctx: Context, categoryKey: string, index: number): Promise<void> {
  const category = getCategory(categoryKey);
  const item = category?.items[index];
  if (ctx.from) {
    await setUserMemory(ctx.from.id, { lastVoiceNoteCategory: categoryKey, lastRoomVisited: "Voice Notes" });
  }

  if (!category || !item) {
    await sendVoiceNotes(ctx);
    return;
  }

  try {
    await ctx.replyWithVoice(toTelegramInput(item.audioSource), {
      caption: voiceNoteCaption(item),
      reply_markup: voiceNoteItemKeyboard(category)
    });
  } catch {
    await ctx.replyWithAudio(toTelegramInput(item.audioSource), {
      caption: voiceNoteCaption(item),
      reply_markup: voiceNoteItemKeyboard(category)
    });
  }
}
