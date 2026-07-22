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
      {
        audioSource: "assets/voice/cute-sensual-deja-daily-check-in.m4a",
        title: "Cute Sensual Deja Daily Check-In"
      },
      ...futureVoiceNoteItems
    ]
  },
  {
    key: "miss_me",
    label: "Listen When You Miss Me",
    items: [
      {
        audioSource: "assets/voice/miss-me-boys.m4a",
        title: "Miss Me Boys"
      },
      {
        audioSource: "assets/voice/miss-you-voice-note.m4a",
        title: "Miss You Voice Note"
      }
    ]
  },
  {
    key: "instructions",
    label: "Goddess Instructions",
    items: [
      {
        audioSource: "assets/voice/goddess-deja-daily-check-in.m4a",
        title: "Goddess Deja Daily Check-In"
      },
      {
        audioSource: "assets/voice/did-you-worship-me-today.m4a",
        title: "Did You Worship Me Today?"
      }
    ]
  },
  {
    key: "girlfriend",
    label: "Sweet Girlfriend Notes",
    items: [
      {
        audioSource: "assets/voice/girlfriend-experience-for-the-month.m4a",
        title: "Girlfriend Experience for the Month"
      },
      {
        audioSource: "assets/voice/good-night-note.m4a",
        title: "Good Night Note"
      }
    ]
  },
  {
    key: "after_hours",
    label: "After Hours Audio",
    items: [
      {
        audioSource: "assets/voice/stroke-for-purpose.mp3",
        title: "Stroke for Purpose"
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

function voiceNoteListKeyboard(category: VoiceNoteCategory): InlineKeyboard {
  const keyboard = new InlineKeyboard();

  category.items.forEach((item, index) => {
    keyboard.text(item.title || `Voice Note ${index + 1}`, `VOICE_NOTE_${category.key}_${index}`).row();
  });

  keyboard.text("Back to Voice Notes", "VOICE_NOTES").row().text("Main Menu", "MENU");
  return keyboard;
}

function voiceNoteItemKeyboard(category: VoiceNoteCategory, index: number): InlineKeyboard {
  const keyboard = new InlineKeyboard();
  const previousIndex = index - 1;
  const nextIndex = index + 1;

  if (previousIndex >= 0) {
    keyboard.text("Previous Voice Note", `VOICE_NOTE_${category.key}_${previousIndex}`);
  }

  if (nextIndex < category.items.length) {
    keyboard.text("Next Voice Note", `VOICE_NOTE_${category.key}_${nextIndex}`);
  }

  if (previousIndex >= 0 || nextIndex < category.items.length) {
    keyboard.row();
  }

  keyboard
    .text("Back to This Voice Door", `VOICE_CATEGORY_${category.key}`)
    .row()
    .text("Back to Voice Notes", "VOICE_NOTES")
    .row()
    .text("Gifts & Considerations", "WORLD_GIFTS")
    .text("Private Access", "WORLD_PRIVATE")
    .row()
    .text("Main Menu", "MENU");

  return keyboard;
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

  if (category.items.length === 1) {
    await sendVoiceNoteItem(ctx, category.key, 0);
    return;
  }

  await ctx.reply("Choose the voice note you want from this door.", {
    reply_markup: voiceNoteListKeyboard(category)
  });
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
      reply_markup: voiceNoteItemKeyboard(category, index)
    });
  } catch {
    await ctx.replyWithAudio(toTelegramInput(item.audioSource), {
      caption: voiceNoteCaption(item),
      reply_markup: voiceNoteItemKeyboard(category, index)
    });
  }
}
