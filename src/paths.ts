import { InlineKeyboard, type Context } from "grammy";
import { linkDoorwayCallbackData } from "./links.js";

const siteBaseUrl = "https://divinedeja.com";

type OfficialPath = {
  label: string;
  url?: string;
  doorwayKey?: string;
};

const officialPaths: OfficialPath[] = [
  { label: "Official World", url: siteBaseUrl },
  { label: "Watch Me", doorwayKey: "site_clips" },
  { label: "Ask Correctly", doorwayKey: "site_vip" },
  { label: "Send Tribute", doorwayKey: "site_spoil" },
  { label: "Get Closer", doorwayKey: "site_access" },
  { label: "Look Again", doorwayKey: "gallery" },
  { label: "Verify Me", doorwayKey: "verified_links" },
  { label: "About Deja", doorwayKey: "site_about" }
];

export function pathsKeyboard(): InlineKeyboard {
  return new InlineKeyboard()
    .url("Official World", siteBaseUrl)
    .row()
    .text("Watch Me", linkDoorwayCallbackData("site_clips"))
    .text("Ask Correctly", linkDoorwayCallbackData("site_vip"))
    .row()
    .text("Send Tribute", linkDoorwayCallbackData("site_spoil"))
    .text("Get Closer", linkDoorwayCallbackData("site_access"))
    .row()
    .text("Look Again", linkDoorwayCallbackData("gallery"))
    .text("Verify Me", linkDoorwayCallbackData("verified_links"))
    .row()
    .text("About Deja", linkDoorwayCallbackData("site_about"))
    .row()
    .text("Back To Deja", "MENU");
}

export async function sendPaths(ctx: Context): Promise<void> {
  const lines = officialPaths.map((path) => path.label);

  await ctx.reply(
    `Make It Official\n\nBe honest about what you came for. Some people watch. Some ask. Some send tribute. Some know better than to trust a random link.\n\nDivineDeja.com is the source of truth. If a profile, payment request, store, or message is not linked there, treat it as unverified.\n\n${lines.join("\n")}\n\n18+ only for adult-oriented creator platforms.`,
    {
      reply_markup: pathsKeyboard()
    }
  );
}
