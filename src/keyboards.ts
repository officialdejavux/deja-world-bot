import { InlineKeyboard } from "grammy";
import type { LinkRecord, Mood } from "./storage.js";

export const moodLabels: Record<Mood, string> = {
  experience: "Come Closer",
  divine: "Serve Deja",
  balanced: "Stay Polished"
};

export function moodKeyboard(): InlineKeyboard {
  return new InlineKeyboard()
    .text("Come Closer", "MOOD_experience")
    .text("Serve Deja", "MOOD_divine")
    .row()
    .text("Stay Polished", "MOOD_balanced");
}

export function roomKeyboard(): InlineKeyboard {
  return new InlineKeyboard()
    .text("Enter Properly", "ROOM_foyer")
    .text("Make It Official", "PATHS")
    .row()
    .text("Watch Me", "ROOM_vault")
    .text("Ask Correctly", "ROOM_lounge")
    .row()
    .text("Send Tribute", "ROOM_temple")
    .text("Get Closer", "ROOM_diary")
    .row()
    .text("Look Again", "ROOM_mirror")
    .text("Verify Me", "LINKS")
    .row()
    .text("Gallery", "GALLERY")
    .text("Voice Notes", "VOICE_NOTES")
    .row()
    .text("Today's Worship", "WORSHIP")
    .text("Set Your Tone", "CHOOSE_MOOD");
}

export function backToMenuKeyboard(): InlineKeyboard {
  return new InlineKeyboard()
    .text("Back To Deja", "MENU")
    .text("Official Paths", "PATHS")
    .row()
    .text("Verified Links", "LINKS");
}

export function linksKeyboard(links: LinkRecord[], mainWebsiteKey: string): InlineKeyboard {
  const keyboard = new InlineKeyboard();
  const mainWebsite = links.find((item) => item.key === mainWebsiteKey && item.url);

  if (mainWebsite) {
    keyboard.url(mainWebsite.label, mainWebsite.url).row();
  }

  for (const link of links.filter((item) => item.url)) {
    if (link.key !== mainWebsiteKey) {
      keyboard.text(link.label, `LINK_DOORWAY_${link.key}`).row();
    }
  }

  keyboard.text("Back To Deja", "MENU");
  return keyboard;
}

export function linkDoorwayKeyboard(link: LinkRecord): InlineKeyboard {
  return new InlineKeyboard()
    .url(link.label, link.url)
    .row()
    .text("Verified Links", "LINKS")
    .text("Back To Deja", "MENU");
}
