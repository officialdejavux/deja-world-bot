import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { InlineKeyboard, InputFile, type Bot, type Context } from "grammy";
import type { InputPaidMedia } from "grammy/types";
import { getOffer, offerLabel, type ResolvedOffer } from "./offers.js";

// Keep intimate paid-media files isolated from the public gallery.
const intimateGallerySources = [
  "assets/intimate/intimate-01.jpg",
  "assets/intimate/intimate-02.jpg",
  "assets/intimate/intimate-03.jpg",
  "assets/intimate/intimate-04.jpg",
  "assets/intimate/intimate-05.jpg",
  "assets/intimate/intimate-06.jpg",
  "assets/intimate/intimate-07.jpg"
];

function intimateGalleryOffer(): ResolvedOffer & { stars: number } {
  const offer = getOffer("intimate_gallery");
  if (!offer?.stars) throw new Error("Missing intimate gallery Stars price.");
  return { ...offer, stars: offer.stars };
}

function paidMedia(): InputPaidMedia[] {
  return intimateGallerySources.map((source) => {
    const filePath = resolve(process.cwd(), source);
    if (!existsSync(filePath)) {
      throw new Error(`Missing intimate gallery asset: ${source}`);
    }

    return {
      type: "photo",
      media: new InputFile(filePath)
    };
  });
}

async function sendIntimateDoorway(ctx: Context): Promise<void> {
  const offer = intimateGalleryOffer();
  await ctx.reply(
    [
      "You’re choosing:",
      offerLabel(offer),
      "",
      "Includes:",
      offer.shortDescription,
      "",
      "Instant unlock:",
      `⭐ Telegram Stars — ${offer.stars.toLocaleString()} Stars`,
      "",
      "Manual support:",
      "Manual payments do not unlock this gallery automatically.",
      "",
      "By continuing, you confirm that you are 18 or older and that you will keep what you unlock private."
    ].join("\n"),
    {
      reply_markup: new InlineKeyboard()
        .text("I am 18+ — Unlock the Gallery", "DEJA_INTIMATE_UNLOCK")
        .row()
        .text("Back to Deja Always", "DEJA_ALWAYS")
    }
  );
}

async function sendIntimatePaidMedia(ctx: Context): Promise<void> {
  try {
    const offer = intimateGalleryOffer();
    await ctx.replyWithPaidMedia(offer.stars, paidMedia(), {
      caption: "A More Intimate Look\n\nSeven private photographs. Unlock once with Telegram Stars.",
      protect_content: true
    });
  } catch (error) {
    console.error("Intimate gallery error:", error instanceof Error ? error.message : "Unknown error");
    await ctx.reply("This private door is resting for a moment. Please try again soon.", {
      reply_markup: new InlineKeyboard().text("Back to Deja Always", "DEJA_ALWAYS")
    });
  }
}

export function registerIntimateGalleryHandlers(bot: Bot): void {
  bot.callbackQuery("DEJA_INTIMATE", async (ctx) => {
    await ctx.answerCallbackQuery();
    await sendIntimateDoorway(ctx);
  });

  bot.callbackQuery("DEJA_INTIMATE_UNLOCK", async (ctx) => {
    await ctx.answerCallbackQuery({ text: "Opening the private gallery." });
    await sendIntimatePaidMedia(ctx);
  });
}
