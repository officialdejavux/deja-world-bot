import { Bot } from "grammy";
import { registerAdminCommands } from "./admin.js";
import { config } from "./config.js";
import { handleDejaAlwaysText } from "./dejaAlways.js";
import { sendGallery, sendGalleryCategory, sendGalleryItem } from "./gallery.js";
import { moodKeyboard, moodLabels } from "./keyboards.js";
import { sendLinkDoorway } from "./links.js";
import { isRoomKey, sendMenu, sendRoom } from "./rooms.js";
import {
  deleteUser,
  ensureStorage,
  getUser,
  setUserMood,
  setUserStopped,
  upsertUser,
  type Mood
} from "./storage.js";
import { sendVoiceCategory, sendVoiceNoteItem, sendVoiceNotes } from "./voiceNotes.js";
import { sendTodaysWorship } from "./worship.js";
import { registerWorldCommands, sendMainMenu } from "./world.js";

const bot = new Bot(config.botToken);

bot.use(async (ctx, next) => {
  if (ctx.from) {
    await upsertUser(ctx.from);
  }
  await next();
});

// Main entry commands (/start, /menu, /links, /gallery, /worship, and world navigation)
// are owned by src/world.ts so the age gate remains the first step.
registerWorldCommands(bot);

bot.command("voice_notes", async (ctx) => {
  await sendVoiceNotes(ctx);
});

bot.command("about", async (ctx) => {
  await ctx.reply(
    "About Divine Deja\n\nDivine Deja is the controlled center of TS Deja Vu's creator world.\n\nNot a feed. Not a link dump. A place to be directed.\n\nWatch when you want to look. Ask when you can be clear. Tribute when you want to be remembered. Verify when you know better than to trust strangers.\n\nThe creator account is @dejaxx_a. This bot does not automate or control that account."
  );
});

bot.command("privacy", async (ctx) => {
  await ctx.reply(
    "Privacy\n\nThis bot stores only minimal Telegram interaction data needed for the experience:\n\n- Telegram user ID\n- Username, if available\n- First name, if available\n- Mood choice\n- Stop/opt-out status\n- Basic message count and timestamps\n- Telegram Stars purchase confirmations, if you buy in-bot access\n- Manual payment review notes or screenshots, only if you send them\n\nIt does not store card details, payment method details, private documents, or control any creator account.\n\nUse /delete_my_data to remove your local bot profile.\nUse /stop to opt out of broadcasts."
  );
});

bot.command("myid", async (ctx) => {
  if (!ctx.from) return;
  await ctx.reply(`Your numeric Telegram ID is:\n\n${ctx.from.id}`);
});

bot.command("delete_my_data", async (ctx) => {
  if (!ctx.from) return;
  await deleteUser(ctx.from.id);
  await ctx.reply("Your local bot data has been deleted.\n\nYou can enter again anytime with /start.");
});

bot.command("stop", async (ctx) => {
  if (!ctx.from) return;
  await setUserStopped(ctx.from.id, true);
  await ctx.reply("You are opted out.\n\nYou can still use the bot, but you will not receive broadcasts.");
});

registerAdminCommands(bot);

bot.callbackQuery("CHOOSE_MOOD", async (ctx) => {
  await ctx.answerCallbackQuery();
  await ctx.reply("Choose your tone before you step closer.", {
    reply_markup: moodKeyboard()
  });
});

bot.callbackQuery(/^MOOD_(experience|divine|balanced)$/, async (ctx) => {
  const mood = ctx.match[1] as Mood;
  await setUserMood(ctx.from.id, mood);
  await ctx.answerCallbackQuery({ text: `${moodLabels[mood]} saved.` });
  await ctx.reply(`${moodLabels[mood]} selected.\n\nNow admit what you came for.`);
  await sendMenu(ctx);
});

bot.callbackQuery("GALLERY", async (ctx) => {
  await ctx.answerCallbackQuery();
  await sendGallery(ctx);
});

bot.callbackQuery(/^GALLERY_CATEGORY_(.+)$/, async (ctx) => {
  await ctx.answerCallbackQuery();
  await sendGalleryCategory(ctx, ctx.match[1]);
});

bot.callbackQuery(/^GALLERY_ITEM_(.+)_(\d+)$/, async (ctx) => {
  await ctx.answerCallbackQuery();
  await sendGalleryItem(ctx, ctx.match[1], Number(ctx.match[2]));
});

bot.callbackQuery("VOICE_NOTES", async (ctx) => {
  await ctx.answerCallbackQuery();
  await sendVoiceNotes(ctx);
});

bot.callbackQuery(/^VOICE_CATEGORY_(.+)$/, async (ctx) => {
  await ctx.answerCallbackQuery();
  await sendVoiceCategory(ctx, ctx.match[1]);
});

bot.callbackQuery(/^VOICE_NOTE_(.+)_(\d+)$/, async (ctx) => {
  await ctx.answerCallbackQuery();
  await sendVoiceNoteItem(ctx, ctx.match[1], Number(ctx.match[2]));
});

bot.callbackQuery(/^LINK_DOORWAY_(.+)$/, async (ctx) => {
  await ctx.answerCallbackQuery();
  await sendLinkDoorway(ctx, ctx.match[1]);
});

bot.callbackQuery("WORSHIP", async (ctx) => {
  await ctx.answerCallbackQuery();
  const user = ctx.from ? await getUser(ctx.from.id) : undefined;
  await sendTodaysWorship(ctx, user?.mood);
});

bot.callbackQuery(/^ROOM_(.+)$/, async (ctx) => {
  const room = ctx.match[1];
  await ctx.answerCallbackQuery();

  if (!isRoomKey(room)) {
    await sendMenu(ctx);
    return;
  }

  await sendRoom(ctx, room);
});

bot.on("message:text", async (ctx) => {
  if (ctx.message.text.startsWith("/")) return;
  if (await handleDejaAlwaysText(ctx)) return;
  await ctx.reply("Use the buttons, love. I made the path obvious.");
  await sendMainMenu(ctx);
});

function apiErrorDetails(error: unknown): { method?: string; message: string } {
  const direct = error as { method?: string; description?: string; message?: string; error?: unknown };
  const nested = direct.error as { method?: string; description?: string; message?: string } | undefined;

  return {
    method: nested?.method ?? direct.method,
    message: `${nested?.description ?? ""} ${nested?.message ?? ""} ${direct.description ?? ""} ${direct.message ?? ""}`
  };
}

function isStaleCallbackAnswerError(error: unknown): boolean {
  const { method, message } = apiErrorDetails(error);

  return (
    method === "answerCallbackQuery" &&
    (message.includes("query is too old") ||
      message.includes("response timeout expired") ||
      message.includes("query ID is invalid"))
  );
}

function isPollingConflictError(error: unknown): boolean {
  const { method, message } = apiErrorDetails(error);
  return method === "getUpdates" && message.includes("Conflict");
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function startBotWithPollingRetry(maxAttempts = 6): Promise<void> {
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      await bot.start({
        onStart: (info) => {
          console.log(`Bot started as @${info.username}.`);
        }
      });
      return;
    } catch (error) {
      if (!isPollingConflictError(error) || attempt === maxAttempts) {
        throw error;
      }

      console.log("Another polling instance is handing off. Retrying bot start in 5 seconds.");
      await wait(5000);
    }
  }
}

bot.catch((error) => {
  if (isStaleCallbackAnswerError(error)) return;
  console.error("Bot error:", error.error instanceof Error ? error.error.message : "Unknown error");
});

async function main(): Promise<void> {
  await ensureStorage();

  const userCommands = [
    { command: "start", description: "Enter Divine Deja" },
    { command: "menu", description: "Main Menu" },
    { command: "gallery", description: "Gallery" },
    { command: "voice", description: "Voice Notes" },
    { command: "gifts", description: "Gifts & Considerations" },
    { command: "spoil", description: "Spoil Me" },
    { command: "worship", description: "Worship gifts" },
    { command: "reup", description: "Reups" },
    { command: "always", description: "Deja Always" },
    { command: "topup", description: "Top Up Messages" },
    { command: "links", description: "Official Links" },
    { command: "private", description: "Private Access" },
    { command: "rules", description: "Rules" },
    { command: "help", description: "Help" },
    { command: "support", description: "Payment and access help" },
    { command: "paysupport", description: "Payment status and help" },
    { command: "terms", description: "Terms" },
    { command: "privacy", description: "Privacy and data choices" },
    { command: "myid", description: "Show your numeric Telegram ID" },
    { command: "delete_my_data", description: "Delete your bot data" },
    { command: "stop", description: "Opt out of broadcasts" }
  ];

  const adminCommands = [
    { command: "admin", description: "Admin commands" },
    { command: "stats", description: "Admin stats" },
    { command: "analytics", description: "Admin analytics summary" },
    { command: "recent_payments", description: "Admin recent Stars payments" },
    { command: "user_payments", description: "Admin user Stars payments" },
    { command: "private_drop", description: "Admin private drop by tier" },
    { command: "expire_access", description: "Admin expire stale access" },
    { command: "broadcast", description: "Admin broadcast" },
    { command: "pending", description: "Admin pending access" },
    { command: "user_status", description: "Admin user access status" },
    { command: "approve_user", description: "Admin approve access" },
    { command: "add_credits", description: "Admin add credits" },
    { command: "remove_access", description: "Admin remove access" }
  ];

  await bot.api.setMyCommands(userCommands, { scope: { type: "default" } });

  for (const adminId of config.adminTelegramIds) {
    await bot.api.setMyCommands([...userCommands, ...adminCommands], {
      scope: { type: "chat", chat_id: Number(adminId) }
    });
  }

  console.log(`Starting @${config.botUsername} in polling mode.`);
  await startBotWithPollingRetry();
}

void main();
