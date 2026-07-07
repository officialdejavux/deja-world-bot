# DEJA BOT SETUP REPORT

Audit date: July 7, 2026  
Project path: `/Users/dasiaames/Documents/dejaworldtelegrambot/deja-world-bot`  
Scope: source/configuration audit only. No bot source code was changed.

## 1. Tech Stack

### Main language/framework

- Language: TypeScript.
- Runtime: Node.js.
- Module format: ESM, configured by `"type": "module"` in `package.json`.
- There is no web framework, dashboard, Next.js app, backend API, or Mini App in the active build.

### Telegram library used

- Telegram library: grammY.
- Bot entry point: `src/bot.ts`.
- Main Telegram bot instance: `const bot = new Bot(config.botToken)` in `src/bot.ts`.

### Payment provider or subscription system used

- Instant in-bot payments use Telegram Stars.
- Stars invoices are created with `ctx.replyWithInvoice(...)` in `src/dejaAlways.ts`.
- Telegram Stars currency is `XTR`.
- Direct/manual payment links use CashApp, PayPal, and Venmo in `src/stripeDoors.ts`, `src/world.ts`, and `src/dejaAlways.ts`.
- Despite the legacy filename `src/stripeDoors.ts`, I did not find an active Stripe API, Stripe webhook, Stripe checkout link, or Stripe SDK in the bot code.
- The intimate gallery uses Telegram paid media through `ctx.replyWithPaidMedia(...)` in `src/intimateGallery.ts`.

### Database/storage used

- Storage is local JSON only.
- User storage: `data/users.json`.
- Link storage: `data/links.json`.
- Storage helper: `src/storage.ts`.
- Writes are atomic-style: temp file write, backup copy, then rename.
- There is no active PostgreSQL, Prisma client, Redis, BullMQ, or hosted database in the active bot build.
- Important risk: Railway/container file systems are usually not durable across redeploys unless a volume is attached. The current repo uses local JSON, and `railway.json` does not show a persistent volume.

### Hosting/deployment setup

- Deployment config: `railway.json`.
- Build uses `Dockerfile`.
- Docker image copies `src`, `data`, and `assets`, then runs `pnpm build`.
- Runtime command: `pnpm start`.
- Bot runs in polling mode, not webhook mode.

### Important scripts/commands

- Install: `pnpm install`
- Local development: `pnpm dev`
- TypeScript build: `pnpm build`
- Production start: `pnpm start`

Defined in `package.json`:

- `dev`: `tsx watch src/bot.ts`
- `build`: `tsc`
- `start`: `node dist/bot.js`

## 2. Current Bot Flow

### Important flow note

There are overlapping command handlers for `/start`, `/menu`, `/links`, `/gallery`, and `/worship`.

- `src/bot.ts` calls `registerWorldCommands(bot)` first.
- `src/world.ts` registers `/start` with the age-gate entry.
- `src/bot.ts` then registers another `/start` with the older mood-selector copy.

In grammY, the first matching handler normally handles the update unless it calls `next()`. The world/age-gate `/start` appears to be the active intended entry, but the duplicate handlers are a maintainability risk.

### Full user journey map

| Step | Message shown | Buttons shown | Callback/action | Handler | Data changes |
|---|---|---|---|---|---|
| User opens bot and sends `/start` | `Welcome back, love... This is your companion-style entry into Deja World... confirm that you are 18+ and entering respectfully.` | `I am 18+ — Let me in`, `Not for me` | `WORLD_AGE_YES`, `WORLD_AGE_NO` | `registerWorldCommands()` in `src/world.ts` | Middleware in `src/bot.ts` runs `upsertUser(ctx.from)`, creating/updating user, message count, timestamps |
| User declines age gate | `No hard feelings. Pretty things are better when they are chosen.` | None | `WORLD_AGE_NO` | `src/world.ts` | Only normal user upsert already happened |
| User confirms age gate | `Hi pretty thing... I was wondering when you’d find me... tell me what kind of mood you’re in tonight.` | `I want sweet Deja`, `I want goddess Deja`, `I just want to talk`, `I want to explore`, `I want private access` | `DEJA_ONBOARD_*` | `sendOnboardingMood()` in `src/dejaAlways.ts` | No mood saved until a mood button is chosen |
| Mood choice: sweet | `Mm, sweet looks good on you...` | `Enter The Soft Room`, `Keep Chatting With Deja`, `Main Menu` | `DEJA_ONBOARD_sweet` | `src/dejaAlways.ts` | `setUserConversationVibe(..., "sweet")` |
| Mood choice: goddess | `Careful... That door is for the ones who like beauty with power behind it...` | `Enter The Goddess Room`, `Spoil Me Properly`, `Main Menu` | `DEJA_ONBOARD_goddess` | `src/dejaAlways.ts` | `setUserConversationVibe(..., "goddess")` |
| Mood choice: talk | `Then talk to me... Tell me what you came here looking for...` | `Keep Chatting With Deja`, `Deja Always`, `Main Menu` | `DEJA_ONBOARD_talk` | `src/dejaAlways.ts` | `setUserConversationVibe(..., "talk")` |
| Mood choice: explore | `Good choice... There are a few sides of me in here...` | `Open Full Menu`, `Gallery`, `Voice Notes`, `After Hours` | `DEJA_ONBOARD_explore` | `src/dejaAlways.ts` | `setUserConversationVibe(..., "explore")` |
| Mood choice: private | `Private access is for serious curiosity...` | `Private Access`, `Gifts & Considerations`, `Main Menu`; then direct payment area | `DEJA_ONBOARD_private` | `src/dejaAlways.ts`, then `sendStripeArea(ctx, "entry")` | `setUserConversationVibe(..., "private")` |
| Main menu | `You’re inside. Pick a doorway...` | `The Soft Room`, `The Goddess Room`, `After Hours`, `Gallery`, `Voice Notes`, `Spoil Me 💎`, `Worship 👑`, `Reups ⚡`, `Deja Always`, `Private Access`, `Official Links`, `Rules` | `WORLD_*`, `GALLERY`, `VOICE_NOTES`, `DEJA_ALWAYS` | `sendMainMenu()` in `src/world.ts` | No direct data change |
| Soft Room | `The Soft Room is where I let you feel close to me...` | `Sweet Deja`, `Romantic Mood`, `Come Closer`, `Back to Menu` | `WORLD_SOFT_*` | `sendSoftRoom()` in `src/world.ts` | `setUserMemory(..., { lastRoomVisited: "The Soft Room" })` |
| Goddess Room | `The Goddess Room is for the ones who already know...` | `Worship Energy`, `Spoil Me Properly`, `Rules of Attention`, `Back to Menu` | `WORLD_GODDESS_*` | `sendGoddessRoom()` in `src/world.ts` | `setUserMemory(..., { lastRoomVisited: "The Goddess Room" })` |
| After Hours | `After Hours is where curiosity gets louder...` | `Teaser Door`, `Clips / Premium`, `Private Content`, `Back to Menu` | `WORLD_AFTER_*` | `sendAfterHours()` in `src/world.ts` | `setUserMemory(..., { lastRoomVisited: "After Hours" })` |
| Public gallery | `Look Again... A glimpse is enough when it is placed correctly.` | Gallery category buttons plus `Back to Menu` | `GALLERY_CATEGORY_*`, `GALLERY_ITEM_*` | `src/gallery.ts` | Saves `lastGalleryCategory` and `lastRoomVisited: "Gallery"` |
| Voice notes | `Some things feel better when you hear them from me...` | Voice note category buttons plus `Back to Menu` | `VOICE_CATEGORY_*`, `VOICE_NOTE_*` | `src/voiceNotes.ts` | Saves `lastVoiceNoteCategory` and `lastRoomVisited: "Voice Notes"` |
| Empty voice category | `This voice note is still being prepared...` | `Back to Voice Notes`, `Gifts & Considerations`, `Private Access`, `Main Menu` | Various | `sendVoiceCategory()` in `src/voiceNotes.ts` | Saves category memory |
| Spoil Me | `Spoil Me... Choose the kind of pretty gesture...` | Gift option buttons, `Private Access`, `Official Links`, `Back to Menu`; then direct payment door prompt | `WORLD_SPOIL_*`, `STRIPE_CONFIRM_*` | `sendGifts()` in `src/world.ts`, `sendStripeArea()` in `src/stripeDoors.ts` | Saves `lastRoomVisited: "Spoil Me"` |
| Worship | `Worship... This door is for bigger gestures...` | `$100`, `$250`, `$500`, `$1000`, `Custom Offering`, `Today’s Worship`, `Reups`, `Spoil Me`, `Back to Menu` | `WORLD_WORSHIP_GIFT_*` | `sendWorshipDoorway()` in `src/world.ts` | Saves `lastRoomVisited: "Worship"` |
| Reups | `Reups... Add to the experience...` | Reup option buttons, `Worship`, `Spoil Me`, `Back to Menu`; then direct payment area | `WORLD_REUP_*`, `STRIPE_CONFIRM_*` | `sendReups()` in `src/world.ts` | Saves `lastRoomVisited: "Reups"` |
| Deja Always | `Deja Always... For the ones who do not just want to visit my world once...` plus memory lines if present | `Keep Chatting`, `Top Up Messages`, `Girlfriend Access`, `Goddess Access`, `VIP Deja`, `What Do I Get?`, `A More Intimate Look`, `My Access / My Status`, `Choose Your Door`, `Back to Menu` | `DEJA_ALWAYS_*` | `sendDejaAlways()` in `src/dejaAlways.ts` | Reads user memory and access |
| Unpaid user taps Keep Chatting | `This door is still locked, pretty thing... Unlock it with Stars for instant access, or request manual review...` | `Top Up Messages`, `Girlfriend Access`, `Goddess Access`, `Request Manual Review`, `Back to Deja Always` | `DEJA_ALWAYS_CHAT` | `sendKeepChatting()` in `src/dejaAlways.ts` | No access change |
| Paid user taps Keep Chatting | `Your key is active. Come in...` | `Sweet Talk`, `Goddess Talk`, `After Hours Mood`, `I Missed You`, `Send Me a Pretty Glimpse`, `Back to Deja Always` | `DEJA_CHAT_*` | `sendKeepChatting()` in `src/dejaAlways.ts` | No change until user chooses prompt or sends text |
| Paid user sends text | `Come closer. I heard you... Tell me which kind of attention you want next.` | Active chat keyboard | plain text handler | `handleDejaAlwaysText()` in `src/dejaAlways.ts`, called from `src/bot.ts` | Consumes 1 message credit unless active membership |
| Top Up Messages | `Top Up Messages... Choose how close you want to stay.` plus price lines | `10 Messages`, `30 Messages`, `60 Messages`, `Day Pass`, `Back to Deja Always` | `DEJA_TOPUP_*` | `sendTopUpMessages()` in `src/dejaAlways.ts` | No change until payment success |
| Top-up purchase card | `You’re choosing: [offer]... Instant unlock: Telegram Stars... Manual support...` | Stars pay button, CashApp, PayPal, Venmo, `I Paid, Add My Messages`, `Need Help`, `Back` | `DEJA_PAY_OFFER_*`, `DEJA_LET_ME_IN_topup` | `sendPurchaseCard()` in `src/dejaAlways.ts` | No change until successful Stars payment or manual proof |
| Girlfriend Access | `Girlfriend Access is for the ones who want me soft, sweet, and close...` | `Weekly Girlfriend Experience`, `Monthly Girlfriend Experience`, `What You Get`, `Sweet Check-In Preview`, `Back to Deja Always` | `DEJA_GF_PLAN_*`, `DEJA_ACCESS_MORE_girlfriend` | `sendMembership()` in `src/dejaAlways.ts` | No change until payment success/manual approval |
| Goddess Access | `Goddess Access is for the ones who like devotion with their attention...` | `Learn More`, `Choose Goddess Access`, `Tribute Door`, `Goddess Room Preview`, `Back to Deja Always` | `DEJA_ACCESS_CHOOSE_goddess`, `DEJA_PREVIEW_goddess` | `sendMembership()` in `src/dejaAlways.ts` | No change until payment success/manual approval |
| VIP Deja | `VIP Deja is for the ones who want the closest door...` | `Learn More`, `Choose VIP Deja`, `VIP Preview`, `Back to Deja Always` | `DEJA_ACCESS_CHOOSE_vip`, `DEJA_PREVIEW_vip` | `sendMembership()` in `src/dejaAlways.ts` | No change until payment success/manual approval |
| Stars invoice | Invoice title is offer label; description is `Telegram Stars checkout for Deja Always. Access opens automatically after Telegram confirms the payment.` | Telegram invoice UI | `pre_checkout_query`, then `message:successful_payment` | `sendPaymentInvoice()`, `pre_checkout_query`, `applySuccessfulPayment()` in `src/dejaAlways.ts` | On success: records payment, adds credits or membership, stores last offer |
| Failed/canceled payment | No custom bot message found. Telegram handles the canceled invoice client-side. | Telegram invoice UI | None in bot | No explicit handler | No data change |
| Unknown/outdated invoice payload | `This checkout door is not available right now...` or `Payment received, but this key is not recognized cleanly...` | Support/back buttons | `pre_checkout_query`, `successful_payment` | `src/dejaAlways.ts` | Rejected pre-checkout or no unlock |
| Successful top-up payment | `Payment confirmed. Your key is active now...` then `Messages Added...` | `Use My Messages`, `Add More Messages`, `Back to Deja Always` | `message:successful_payment` | `applySuccessfulPayment()` and `sendUnlockedTopUpMenu()` | Adds message credits; stores payment history |
| Successful girlfriend/goddess/VIP payment | `Payment confirmed. Your key is active now...` then unlocked menu | Unlocked membership menu | `message:successful_payment` | `applySuccessfulPayment()` | Sets `currentAccessType`, `membershipStatus: approved`, `membershipExpiresAt`, payment history |
| Intimate gallery door | `You’re choosing: A More Intimate Look... By continuing, you confirm that you are 18 or older...` | `I am 18+ — Unlock the Gallery`, `Back to Deja Always` | `DEJA_INTIMATE_UNLOCK` | `src/intimateGallery.ts` | No local user/payment record |
| Intimate gallery unlock | Sends Telegram paid media album | Telegram paid media unlock UI | `replyWithPaidMedia` | `sendIntimatePaidMedia()` in `src/intimateGallery.ts` | No local user/payment record |
| Manual payment start | `Manual payments are reviewed. They do not unlock automatically...` | `Message Credits`, `Girlfriend Access`, `Goddess Access`, `VIP Access`, `Private Access`, `Other`, `Cancel` | `MANUAL_PAYMENT_TYPE_*` | `src/stripeDoors.ts` | Temporary in-memory draft only |
| Manual proof submitted | `I have your manual payment request... waiting for review...` | `Payment Support`, `Deja Always`, `Main Menu` | text/photo/document while draft exists | `src/stripeDoors.ts` | Creates `manualPaymentRequests[]`, sets `adminApprovalStatus: pending` |
| Returning paid user | `Deja Always...` plus lines like `Last door: ...`, `Your mood is still set: ...`, `Last reup: ...`, `Your [key] is active.` | Deja Always keyboard, plus reup same package if available | `DEJA_ALWAYS` | `sendDejaAlways()` | Reads memory/access |
| Expired paid user | Locked flows appear because `hasActiveMembership()` returns false after `membershipExpiresAt` | Locked/access buttons | `DEJA_ALWAYS_CHAT`, status view | `src/storage.ts`, `src/dejaAlways.ts` | Membership is not automatically marked `expired`; it just fails the active check |
| Payment support | `Payment Support... For Telegram Stars purchases... For direct payments...` | `I Sent a Manual Payment`, `My Access / My Status`, `Back to Deja Always` | `/paysupport`, `DEJA_PAY_SUPPORT` | `sendPaymentSupport()` in `src/dejaAlways.ts` | Reads user/access |
| Admin panel | `Admin... Available commands...` | None | `/admin` | `src/admin.ts` | No change |
| Admin pending review | `Pending confirmations...` plus user/request data | Admin review buttons | `/pending`, `ADMIN_APPROVE_*`, `ADMIN_CREDITS_*` | `src/admin.ts` | On approval: grants membership or credits |

## 3. Payment and Access Control

### How users become paid members

There are two payment paths:

1. Telegram Stars instant unlock:
   - User selects a Stars-backed offer.
   - Bot sends a Telegram invoice from `sendPaymentInvoice()` in `src/dejaAlways.ts`.
   - `pre_checkout_query` validates that the offer exists and has a Stars price.
   - `message:successful_payment` calls `applySuccessfulPayment()`.
   - `recordStarsPaymentDelivery()` in `src/storage.ts` grants credits/access and stores payment history.

2. Direct/manual payment:
   - User opens CashApp, PayPal, or Venmo from direct URL buttons.
   - User returns and starts a manual review request.
   - User sends a note, screenshot, or document.
   - Admin reviews `/pending`.
   - Admin grants access with callbacks or commands.

### Paid offers

Current offer registry: `src/offers.ts`.

- `messages_10`: 10 message credits, default reference `$15`, default 750 Stars.
- `messages_30`: 30 message credits, default reference `$35`, default 1750 Stars.
- `messages_60`: 60 message credits, default reference `$65`, default 3250 Stars.
- `day_pass`: 1 day girlfriend access, default reference `$100`, default 5000 Stars.
- `girlfriend_access`: 30 day girlfriend access, no default Stars or price.
- `girlfriend_weekly`: 7 day girlfriend access, default reference `$100`, default 5000 Stars.
- `girlfriend_monthly`: 30 day girlfriend access, default reference `$250`, default 12500 Stars.
- `goddess_access`: 30 day goddess access, no default Stars or price.
- `vip_deja`: 30 day VIP access, no default Stars or price.
- `intimate_gallery`: paid media gallery, default reference `$15`, default 750 Stars.

### How subscription/access status is stored

Stored per user in `data/users.json` through `UserRecord` in `src/storage.ts`.

Important fields:

- `currentAccessType`: `none`, `girlfriend`, `goddess`, or `vip`.
- `membershipStatus`: `none`, `pending`, `approved`, `expired`, or `removed`.
- `membershipExpiresAt`: ISO date if time-limited access was granted.
- `messageCredits`: number of message credits left.
- `lastPurchaseOfferId`: last Stars offer bought.
- `paymentHistory`: recent successful Stars payments.
- `manualPaymentRequests`: manual payment review requests.
- `adminApprovalStatus`: current manual/admin status.

### How the bot checks access

Access helpers are in `src/storage.ts`:

- `hasActiveMembership(user)` returns true only if:
  - user exists,
  - `membershipStatus === "approved"`,
  - `currentAccessType !== "none"`,
  - and `membershipExpiresAt` is missing or still in the future.

- `hasChatAccess(user)` returns true if:
  - user has an active membership, or
  - user has `messageCredits > 0`.

- `consumeChatCredit(userId)` subtracts one message credit only when the user does not have active membership.

### Renewals, failed payments, refunds, cancellations, expired access

- Renewals are not true recurring subscriptions. Users manually re-buy or reup.
- The bot stores `lastPurchaseOfferId` and shows a `Reup Same Package` shortcut.
- Failed/canceled invoice payments do not have a custom bot handler; Telegram handles the invoice UI and the bot receives no `successful_payment`.
- Refunds are not actively handled. `PaymentRecord` has `refunded: false`, but I found no refund command, refund webhook, or refund update handler.
- Expiration is checked lazily by `hasActiveMembership()`.
- Expired users are blocked from chat access, but `membershipStatus` is not automatically changed to `expired`.

### Obvious payment/access loopholes

Good:

- `I Paid, Let Me In` does not grant access by itself.
- Direct CashApp/PayPal/Venmo buttons do not auto-unlock access.
- Stars payment delivery is idempotent by `telegramPaymentChargeId`.
- Unknown invoice payloads are rejected or routed to payment support.
- Admin callbacks re-check numeric admin ID.

Concerns:

- Local JSON on Railway is likely not durable unless a Railway volume is attached. A redeploy can lose paid access and payment history.
- `src/intimateGallery.ts` uses Telegram paid media but does not record the purchase in local storage, notify admin, or update `lastPurchaseOfferId`.
- `goddess_access`, `vip_deja`, and `girlfriend_access` have no default Stars price. They work only if the matching env vars are set.
- Direct/manual review relies on the admin verifying payment outside the bot. That is correct for CashApp/PayPal/Venmo, but it should stay clearly labeled as manual.
- There is no admin denial callback for manual requests. Admin can remove access, but there is no polished deny-request flow.
- There is no automatic cleanup or visible status update when access expires.

## 4. Content and Private World Experience

### What paid users receive

Paid users can receive:

- Message credits or time-limited membership access.
- Deja Always chat prompts.
- Unlocked Girlfriend, Goddess, or VIP menus.
- Mood-specific canned replies.
- Random public gallery glimpse from local images.
- Direct contact details after Girlfriend Access unlock, if configured.
- Paid intimate gallery through Telegram paid media.

### Content type

- Most content is static text in TypeScript files.
- Public gallery media is local image assets in `assets/gallery`.
- Voice notes are local audio assets in `assets/voice`.
- Intimate paid media is local image assets in `assets/intimate`.
- There is no AI-generated response system in the current code.
- There is no scheduler for drops/reminders.
- There is no queue or content calendar.
- Broadcasts are admin-triggered manually through `/broadcast`.

### Media storage/delivery

- Public gallery: `src/gallery.ts`, local files under `assets/gallery`.
- Voice notes: `src/voiceNotes.ts`, local files under `assets/voice`.
- Paid intimate gallery: `src/intimateGallery.ts`, local files under `assets/intimate`.
- Link doorway images can be added through `src/editLater.ts` and `src/links.ts`.
- `src/media.ts` converts local files to `InputFile` when they exist; otherwise it passes the value to Telegram as a string URL/file ID.

### Can users chat back?

Yes, but only in a limited automated way.

- Any non-command text is routed through `handleDejaAlwaysText()` in `src/dejaAlways.ts`.
- If unpaid, the bot replies with the locked-door message.
- If paid or credited, the bot consumes a credit if needed and replies with a canned response plus buttons.
- The bot does not forward every user message to Deja/admin.
- The bot does not create human replies or AI replies.

### Where the closeness experience is created

The feeling of closeness is currently created in:

- `sectionCopy` in `src/worldConfig.ts`.
- Deja Always entry and memory lines in `sendDejaAlways()` in `src/dejaAlways.ts`.
- Mood/vibe selection in `sendOnboardingMood()` and `DEJA_ONBOARD_*` handlers.
- Paid access menus in `sendUnlockedGoddessMenu()`, `sendUnlockedVipMenu()`, and `sendUnlockedGirlfriendMenu()`.
- Voice note categories in `src/voiceNotes.ts`.
- Public gallery and glimpses in `src/gallery.ts` and `sendPrettyGlimpse()`.

## 5. Personalization

### What the bot remembers

Stored in `data/users.json`:

- Telegram ID.
- Username.
- First name.
- Mood from the older mood selector.
- Conversation vibe from onboarding.
- Stopped/opt-out state.
- Message count.
- Created/updated/last seen timestamps.
- Last room visited.
- Last gallery category.
- Last voice note category.
- Last purchase offer ID.
- Current access type.
- Membership status.
- Membership expiration.
- Message credits.
- Last top-up/access request.
- Payment history.
- Manual payment requests.

### Does the experience change based on behavior?

Somewhat.

- Deja Always can show:
  - `Last door: ...`
  - `Your mood is still set: ...`
  - `Last reup: ...`
  - `Your [key] is active.`
- Room messages include mood closers from the older `Mood` field.
- Chat replies use `conversationVibe` through `vibeLine()`.
- Status view shows mood, credits, access, expiration, last purchase, and manual review.

### Opportunities to make it feel more personal without misleading users

- Use first name sparingly in return messages.
- Show a subtle welcome-back line based on the last room/category.
- Make paid menus respond to current access type.
- Add clear disclosure that Deja Always replies are automated prompts unless Deja personally responds elsewhere.
- Add an admin-triggered private note/drop flow so paid users occasionally receive content that feels more alive.
- Add user-visible purchase/access history.
- Add a simple reminder system only if users opt in.

## 6. Admin Tools

### How Deja/admin sends content

- Broadcast command: `/broadcast Message text`.
- Broadcast preview is stored in memory for 10 minutes.
- Admin confirms with `Send Broadcast`.
- Broadcast sends to users returned by `getBroadcastRecipients()`, which excludes users who used `/stop`.

### How users are managed

Admin commands in `src/admin.ts`:

- `/admin`
- `/stats`
- `/broadcast`
- `/pending`
- `/user_status USER_ID`
- `/approve_user USER_ID girlfriend|goddess|vip`
- `/add_credits USER_ID NUMBER`
- `/remove_access USER_ID`

### How paid access can be granted/revoked manually

- Grant membership: `approveUserAccess()` through `/approve_user` or admin callback.
- Add credits: `addUserCredits()` through `/add_credits` or admin callback.
- Remove access/credits: `removeUserAccess()` through `/remove_access`.

### Dashboard/panel

- There is no admin web dashboard.
- Admin is Telegram-command-only.
- Admin access is based only on numeric Telegram IDs from env.

### Admin risks

- If admin IDs are missing or wrong, no one can use admin tools.
- Admin commands expose user payment/access status in Telegram chat.
- Manual proof notes can contain sensitive payment details if users overshare.
- There is no multi-admin audit trail beyond Telegram chat history and JSON state.
- No dedicated deny button exists for manual payment requests.

## 7. Safety, Privacy, and Compliance

### API keys/secrets

- `.env` exists locally, but `.gitignore` ignores `.env`, `.env.local`, and `.env.*.local`.
- `.dockerignore` ignores `.env` and `.env.*`.
- I did not print or copy secret values into this report.
- `.env.example` contains variable names/placeholders only.

### Sensitive logs

Logging is limited:

- Bot startup username.
- Polling handoff retries.
- Generic bot errors.
- Intimate gallery missing-asset error messages.

I did not find code that logs bot tokens, payment details, or `.env` values.

### User data exposure

- User data lives in `data/users.json`.
- `.gitignore` excludes `data/users.json`.
- Concern: `Dockerfile` copies the full `data` directory, and `.dockerignore` does not exclude `data/users.json`. If a real populated `data/users.json` exists during Docker build, it could be included in the image.

### Age gate / 18+ confirmation

There is an age confirmation at entry:

- `sectionCopy.start` in `src/worldConfig.ts`.
- `WORLD_AGE_YES` / `WORLD_AGE_NO` in `src/world.ts`.

There is also an 18+ confirmation for the intimate gallery:

- `sendIntimateDoorway()` in `src/intimateGallery.ts`.

The links screen also says:

- `18+ only for adult-oriented creator platforms.`

### Paid terms disclosure

There is a `/terms` command in `src/stripeDoors.ts`.

Current terms text says:

`Deja World is an 18+ private digital experience. Payments are for digital access, support, interaction, or curated online experiences. No payment guarantees anything outside the stated digital offer. Be respectful, intentional, and clear.`

Purchase cards also distinguish:

- Telegram Stars as instant unlock.
- CashApp/PayPal/Venmo as manual review only.

### Automation vs human disclosure

The bot discloses:

- `@dejaxx_a is the creator account. This bot does not automate or control that account.`

But the paid chat area does not clearly say whether replies are automated prompts, human, or hybrid. Since the current code returns canned automated replies, this should be clarified in the experience or terms.

### Telegram/payment provider policy risks

- The bot includes adult-oriented creator links and paid intimate media.
- It does have an 18+ gate, but policy compliance should be checked directly against Telegram Stars and Telegram paid media rules before scaling.
- Direct payments for adult-oriented access can carry processor risk depending on the processor rules.
- The code is careful not to auto-unlock CashApp/PayPal/Venmo payments, which reduces false-access risk.

### Scary security issues

Highest risk:

- Local JSON persistence on Railway can lose paid user access/history on redeploy without a persistent volume.

Other concerns:

- `data/users.json` should be excluded from Docker context if real data is ever present locally.
- Duplicate `/start` and other command handlers increase the chance of future flow bugs.
- Stale private env names and `prisma.config.ts` can confuse future deployment/debugging.

## 8. Environment Variables

Names only. No secret values included.

### Required by active code

- `BOT_TOKEN`: Telegram bot token. Required at startup by `src/config.ts`.

### Bot identity/admin

- `BOT_USERNAME`: Bot username display/default command setup.
- `OWNER_TELEGRAM_USERNAME`: Creator Telegram username used in copy/contact fallback.
- `OWNER_TELEGRAM_ID`: Owner ID reference.
- `ADMIN_TELEGRAM_ID`: Single numeric admin ID option.
- `ADMIN_TELEGRAM_IDS`: Comma-separated numeric admin IDs.

### Link/payment door variables

- `CLIPS_LINK`: Clips door override.
- `PREMIUM_LINK`: Premium content door override.
- `ONLYFANS_LINK`: OnlyFans door override.
- `FANSLY_LINK`: Fansly door override.
- `CUSTOMS_LINK`: Customs/private request override.
- `THRONE_LINK`: Throne gift link.
- `CASHAPP_LINK`: CashApp manual/direct payment link.
- `PAYPAL_LINK`: PayPal manual/direct payment link.
- `VENMO_LINK`: Venmo manual/direct payment link.
- `WISHLIST_LINK`: Wishlist gift link.
- `GIFT_FORM_LINK`: Gift form link.
- `SITE_SPOIL_LINK`: Website spoil link.
- `COFFEE_GIFT_LINK`: Coffee gift link.
- `DRINKS_GIFT_LINK`: Drinks gift link.
- `SNACK_GIFT_LINK`: Snack gift link.
- `FLOWERS_GIFT_LINK`: Flowers gift link.
- `MANICURE_GIFT_LINK`: Manicure gift link.
- `PEDICURE_GIFT_LINK`: Pedicure gift link.
- `GLAM_GIFT_LINK`: Glam gift link.
- `SHOPPING_GIFT_LINK`: Shopping gift link.
- `VACATION_GIFT_LINK`: Vacation gift link.
- `WORSHIP_100_LINK`: $100 worship link.
- `WORSHIP_250_LINK`: $250 worship link.
- `WORSHIP_500_LINK`: $500 worship link.
- `WORSHIP_1000_LINK`: $1000 worship link.
- `WORSHIP_CUSTOM_LINK`: Custom worship link.
- `REUP_10_LINK`: $10 reup link.
- `REUP_25_LINK`: $25 reup link.
- `REUP_50_LINK`: $50 reup link.
- `REUP_100_LINK`: $100 reup link.
- `REUP_250_LINK`: $250 reup link.
- `REUP_MONTHLY_LINK`: Monthly reup link.
- `TOPUP_PAYMENT_LINK`: Present in `.env.example`; I did not find active use in current source.

### Telegram Stars/offer configuration

- `TOPUP_10_PRICE`: Display reference price for 10 messages.
- `TOPUP_10_STARS`: Stars price for 10 messages.
- `TOPUP_30_PRICE`: Display reference price for 30 messages.
- `TOPUP_30_STARS`: Stars price for 30 messages.
- `TOPUP_60_PRICE`: Display reference price for 60 messages.
- `TOPUP_60_STARS`: Stars price for 60 messages.
- `DAY_PASS_PRICE`: Display reference price for day pass.
- `DAY_PASS_STARS`: Stars price for day pass.
- `INTIMATE_GALLERY_PRICE`: Display reference price for intimate gallery.
- `INTIMATE_GALLERY_STARS`: Stars price for intimate gallery.
- `GIRLFRIEND_ACCESS_PRICE`: Display reference price for general girlfriend access.
- `GIRLFRIEND_ACCESS_STARS`: Stars price for general girlfriend access.
- `GIRLFRIEND_WEEKLY_PRICE`: Display reference price for weekly girlfriend access.
- `GIRLFRIEND_WEEKLY_STARS`: Stars price for weekly girlfriend access.
- `GIRLFRIEND_MONTHLY_PRICE`: Display reference price for monthly girlfriend access.
- `GIRLFRIEND_MONTHLY_STARS`: Stars price for monthly girlfriend access.
- `GODDESS_ACCESS_PRICE`: Display reference price for Goddess Access.
- `GODDESS_ACCESS_STARS`: Stars price for Goddess Access.
- `VIP_DEJA_PRICE`: Display reference price for VIP Deja.
- `VIP_DEJA_STARS`: Stars price for VIP Deja.

### Direct contact/access variables

- `DEJA_PHONE_NUMBER`: Phone number shown after girlfriend access, if configured.
- `DEJA_SNAPCHAT_USERNAME`: Snapchat username shown after girlfriend access.
- `DEJA_DIRECT_TELEGRAM_USERNAME`: Direct Telegram username shown after girlfriend access.
- `BOOKING_LINK`: Booking link override.
- `PRIVATE_REQUEST_LINK`: Private request link override.
- `CUSTOM_REQUEST_LINK`: Custom request link override.
- `CONTACT_LINK`: Contact link override.

### Official link variables

- `MAIN_WEBSITE_LINK`: Main official website override.
- `EXPERIENCE_DEJA_LINK`: Experience Deja link override.
- `LINKME_LINK`: LinkMe/verified links override.
- `X_LINK`: X/Twitter link override.
- `INSTAGRAM_LINK`: Instagram link override.
- `REDDIT_LINK`: Reddit link override.
- `TELEGRAM_CHANNEL_LINK`: Telegram channel/account link override.

### Present in local `.env` but not in `.env.example` / not active in current lightweight source

- `DATABASE_URL`: Legacy/stale database variable; active build uses JSON.
- `REDIS_URL`: Legacy/stale Redis variable; active build does not use Redis.
- `WEBHOOK_URL`: Legacy/stale webhook variable; active build uses polling.
- `WEBHOOK_SECRET`: Legacy/stale webhook variable.
- `APP_BASE_URL`: Legacy/stale app/web variable.
- `NODE_ENV`: Runtime environment.
- `ONLYFANS_URL`: Legacy naming; current code uses `ONLYFANS_LINK`.
- `IWANTCLIPS_URL`: Legacy naming; current code uses data link or other link lookup.
- `MANYVIDS_URL`: Legacy naming.
- `X_URL`: Legacy naming; current code uses `X_LINK`.
- `LINKME_URL`: Legacy naming; current code uses `LINKME_LINK`.
- `TELEGRAM_OWNER_URL`: Legacy naming.
- `ENABLE_PAYMENTS`: Present locally, no active source usage found.
- `TELEGRAM_STARS_PROVIDER_TOKEN`: Present locally, but current Stars invoice uses empty provider token for `XTR`.
- `ADMIN_DASHBOARD_PASSWORD`: Legacy dashboard variable; no active dashboard.
- `ADMIN_SESSION_SECRET`: Legacy dashboard variable; no active dashboard.

## 9. File Map

### Entry point

- `src/bot.ts`: creates the grammY bot, registers commands, starts polling, handles stale callback and polling conflict errors.

### Bot handlers

- `src/world.ts`: companion-style entry, age gate, main menu, rooms, gifts, worship, reups, private access, official links.
- `src/dejaAlways.ts`: paid private world, onboarding moods, Deja Always, chat access, top-ups, Stars invoices, successful payment delivery, status, payment support.
- `src/rooms.ts`: older room menu and room messages.
- `src/keyboards.ts`: older mood/room/link keyboards.
- `src/paths.ts`: official path menu.
- `src/links.ts`: verified link list and immersive link doorway messages.
- `src/gallery.ts`: public gallery categories and photo sending.
- `src/voiceNotes.ts`: voice note categories and audio/voice sending.
- `src/worship.ts`: today’s worship command/section.

### Payment code

- `src/offers.ts`: single offer registry for Stars prices, reference prices, credits, access types, durations, payloads.
- `src/dejaAlways.ts`: Telegram Stars invoice creation, pre-checkout validation, successful payment handling, access delivery.
- `src/intimateGallery.ts`: Telegram paid media for intimate gallery.
- `src/stripeDoors.ts`: legacy-named direct payment/manual review doors using CashApp, PayPal, Venmo. No active Stripe processor.

### Database/storage

- `src/storage.ts`: JSON storage, links, users, stats, access checks, credit consumption, payment history, manual payment requests.
- `data/users.json`: local user/payment/access data.
- `data/links.json`: default official links.

### Content delivery

- `assets/gallery`: public gallery images.
- `assets/voice`: voice note files.
- `assets/intimate`: paid intimate gallery images.
- `src/editLater.ts`: marked insert areas for future gallery, voice notes, spoil options, worship options, reups, and link doorway atmosphere.
- `src/media.ts`: local file/file ID/URL helper.

### Admin tools

- `src/admin.ts`: admin commands, broadcast, pending reviews, user status, manual approval, credit grants, access removal.

### Config/env files

- `src/config.ts`: loads `.env`, validates `BOT_TOKEN`, parses admin IDs.
- `.env.example`: placeholder env names.
- `.gitignore`: excludes `.env` and `data/users.json`.
- `.dockerignore`: excludes `.env` but not `data/users.json`.

### Deployment files

- `Dockerfile`: Railway/container build.
- `railway.json`: Railway build/deploy config.
- `package.json`: scripts/dependencies.
- `tsconfig.json`: TypeScript config.

### Legacy/confusing files

- `prisma.config.ts`: references Prisma and `DATABASE_URL`, but the active TypeScript build only includes `src/**/*.ts`. This looks stale and could confuse future work.

## 10. Honest Product/UX Critique

### What feels premium

- The overall language is cohesive: feminine, private, polished, and intentional.
- The Deja Always area is the strongest part of the product because it gives a reason to return.
- The paid menus now feel more complete than simple link buttons.
- The status screen and reup shortcut are good conversion support.
- The manual/Stars distinction is much clearer than before.
- The public gallery and voice notes make the bot feel more like a world than a directory.

### What feels confusing

- Duplicate `/start` and `/menu` handlers make the real entry flow harder to reason about.
- `src/stripeDoors.ts` is a misleading filename now that the bot intentionally does not use Stripe.
- `goddess_access`, `vip_deja`, and `girlfriend_access` can look available in the UI but may not have Stars prices unless env vars are set.
- The older room system in `src/rooms.ts` and the newer world menu in `src/world.ts` coexist, which can feel like two menu systems.
- Some direct payment door names are abstract, so users may not immediately know what they are buying.

### What might hurt conversion

- If Goddess Access or VIP Deja have no Stars price configured, the instant checkout path becomes a missing-payment path.
- Manual payments require trust and admin review, so they are slower and less satisfying than Stars.
- Paid chat replies are currently canned prompts. If users expect actual Deja or AI conversation, they may feel underwhelmed unless it is disclosed and framed well.
- No durable storage risk can become a serious trust problem if access disappears after redeploy.
- Paid intimate gallery purchases are not visible in local status/history.

### What might make users feel closer to Deja

- Voice notes.
- Return memory lines in Deja Always.
- Girlfriend Access direct contact details after unlock.
- Mood/vibe selection.
- Occasional admin-triggered private updates.
- More personalized status and “welcome back” copy.

### What feels too robotic

- The paid chat currently responds to any user text with a generic canned message.
- The support path is clear but still somewhat procedural.
- Some locked/access messages repeat the same structure.
- Manual review could feel more personal if the user got a clear pending status and later an approval/denial note with the exact offer name.

### What should be improved first

1. Make storage durable before relying on paid memberships.
2. Consolidate duplicate command handlers.
3. Make every paid offer either clearly configured with Stars or clearly manual-only.
4. Add local tracking/admin visibility for intimate gallery paid-media unlocks if possible.
5. Add a clear automation disclosure for chat prompts.

## 11. Recommended Next Changes

### Quick copy changes

- Add one elegant line in Deja Always explaining whether replies are automated prompts, human, or hybrid.
- Clarify that CashApp/PayPal/Venmo are manual review only wherever direct buttons appear.
- Make missing Stars prices feel intentional instead of broken.
- Add offer names/amounts to manual review confirmation messages.

### Onboarding improvements

- Consolidate the duplicate `/start` handlers into one source of truth.
- Keep the age gate first.
- After age confirmation, show mood choice, then a clean main path to Deja Always.
- Avoid maintaining both the older room menu and newer world menu unless both are intentional.

### Payment/access fixes

- Add persistent storage for Railway, or move JSON to a mounted volume.
- Add `data/users.json` to `.dockerignore` so real local user data is never copied into Docker images.
- Configure or intentionally disable Stars for `goddess_access`, `vip_deja`, and `girlfriend_access`.
- Track intimate gallery paid-media unlocks locally if Telegram provides enough update data for that path.
- Add admin deny/manual request resolution.
- Add an expiration cleanup/status pass so expired users show `expired` instead of just failing access checks.
- Consider a `/recent_payments` admin command.

### Personalization improvements

- Use first name lightly after return visits.
- Add “welcome back from [last room]” in the main entry.
- Use last purchase to suggest the next logical reup.
- Make voice note/gallery suggestions depend on last viewed category.
- Add a “what I remember about you” status line that feels polished, not data-heavy.

### Admin/content workflow improvements

- Add admin commands for:
  - `/recent_payments`
  - `/user_payments USER_ID`
  - `/deny_request USER_ID`
  - `/grant_day_pass USER_ID`
- Add a simple “private drop” command for paid users only.
- Add a way to send a voice note or gallery item to paid users by tier.
- Add admin-side pending counts to `/admin`.

### Analytics/events to track

Track these in JSON or an events file:

- `/start`
- Age confirmed/declined.
- Mood selected.
- Main menu opened.
- Each doorway opened.
- Purchase card viewed.
- Stars invoice sent.
- Pre-checkout approved/rejected.
- Stars payment success.
- Duplicate payment detected.
- Manual payment review started.
- Manual proof submitted.
- Admin approved/denied.
- Chat credit consumed.
- User ran out of credits.
- Paid media unlock attempted.
- Paid media unlock failed.
- Broadcast sent.
- User used `/stop`.

### Highest-priority next sprint

1. Storage durability on Railway.
2. Command handler cleanup.
3. Paid offer configuration audit.
4. Explicit automation disclosure.
5. Manual request lifecycle: pending, approved, denied, resolved.

