import type { GalleryItem } from "./gallery.js";
import type { LinkDoorwayConfig } from "./links.js";
import type { ReupOption, SpoilOption } from "./worldConfig.js";
import type { VoiceNoteItem } from "./voiceNotes.js";

/*
  WHERE TO EDIT LATER

  This is the one file to open when you want to add:
  - new gallery pictures
  - new voice notes
  - new spoil/gift buttons
  - new worship and reup amounts
  - optional atmosphere for existing link doorways
  - the reference for the main website link

  Keep the bot logic files alone unless you want to change how the bot works.
*/

export const mainWebsiteEditLocation = {
  linkKey: "website",
  envName: "MAIN_WEBSITE_LINK",
  dataFile: "data/links.json"
} as const;

export const futureGalleryItems: GalleryItem[] = [
  // GALLERY_INSERT_AREA_START
  // Gallery image items go here later.
  // Add one item per picture.
  // Each item supports:
  // - source: image link, local file path, uploaded asset path, or Telegram file_id
  // - optional title
  // - optional caption
  // - optional link
  // - optional doorwayDestination
  //
  // Example:
  // {
  //   source: "assets/gallery/new-photo.jpg",
  //   title: "Look Again",
  //   caption: "A glimpse is enough when it is placed correctly.",
  //   doorwayDestination: "gallery"
  // }
  // GALLERY_INSERT_AREA_END
];

export const futureVoiceNoteItems: VoiceNoteItem[] = [
  // VOICE_NOTES_INSERT_AREA_START
  // Voice note items go here later.
  // Add one item per audio file.
  // Each item supports:
  // - audioSource: audio link, Telegram voice file_id, or local file path
  // - optional title
  // - optional caption
  // - optional date
  //
  // Example:
  // {
  //   audioSource: "assets/voice/new-voice-note.m4a",
  //   title: "Listen Closely",
  //   caption: "No noise. No pretending. Just the updates worth knowing.",
  //   date: "Private List"
  // }
  // VOICE_NOTES_INSERT_AREA_END
];

export const futureSpoilOptions: SpoilOption[] = [
  // SPOIL_INSERT_AREA_START
  // Spoil/gift button sections go here later.
  // Add one item per button.
  // Each item supports:
  // - key: lowercase identifier with no spaces
  // - label: button text, emoji allowed
  // - message: the doorway message users see after tapping
  // - buttons: final outgoing link buttons
  //
  // The lookup can use env names from .env.example or keys from data/links.json.
  //
  // Example:
  // {
  //   key: "dinner",
  //   label: "Dinner 🍽️",
  //   message: "Dinner 🍽️\n\nA thoughtful gesture always tastes better.",
  //   buttons: [
  //     { label: "Send Dinner 🍽️", lookup: { env: "DINNER_GIFT_LINK", key: "cashapp" } }
  //   ]
  // }
  // SPOIL_INSERT_AREA_END
];

export const futureWorshipOptions: ReupOption[] = [
  // WORSHIP_INSERT_AREA_START
  // Bigger worship gift buttons go here later.
  // Add one item per amount or custom doorway.
  //
  // Example:
  // {
  //   key: "750",
  //   label: "$750 💎",
  //   message: "Worship $750 💎\n\nA serious offering deserves a serious doorway.",
  //   buttons: [
  //     { label: "Send $750 💎", lookup: { env: "WORSHIP_750_LINK", key: "site_spoil" } }
  //   ]
  // }
  // WORSHIP_INSERT_AREA_END
];

export const futureReupOptions: ReupOption[] = [
  // REUP_INSERT_AREA_START
  // Reup/top-up buttons go here later.
  // These should always be voluntary and user-approved.
  //
  // Example:
  // {
  //   key: "75",
  //   label: "$75 💗",
  //   message: "Reup $75 💗\n\nA pretty little top-up to keep the door open.",
  //   buttons: [
  //     { label: "Reup $75 💗", lookup: { env: "REUP_75_LINK", key: "cashapp" } }
  //   ]
  // }
  // REUP_INSERT_AREA_END
];

export const futureDoorwayConfigs: LinkDoorwayConfig[] = [
  // DOORWAY_INSERT_AREA_START
  // Optional doorway atmosphere for existing links goes here later.
  // Use a link key from data/links.json, then add optional title, caption, or imageSource.
  // The actual outgoing link still stays in data/links.json or your private .env.
  //
  // Example:
  // {
  //   key: "onlyfans",
  //   imageSource: "assets/gallery/onlyfans-doorway.jpg",
  //   title: "OnlyFans",
  //   caption: "A softer door before the private one."
  // }
  // DOORWAY_INSERT_AREA_END
];
