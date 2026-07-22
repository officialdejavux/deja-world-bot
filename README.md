# DEJA WORLD BOT

A lightweight Telegram bot for Divine Deja.

This bot is its own Telegram bot account. It links users to the official Divine Deja website, `https://divinedeja.com`, and the official creator Telegram account, `@dejaxx_a`, but it does not log into, automate, or control that creator account.

The experience is intentionally simple: users enter through a companion-style 18+ acknowledgment, open the main doorway menu, explore gallery and voice sections, view official doors, and can opt out or delete their local bot data.

## What It Includes

- Node.js
- TypeScript
- grammY Telegram bot framework
- Polling mode
- Local JSON storage
- Inline keyboards
- Telegram-only admin commands
- Optional Stripe Checkout for brand-safe card payments

There is no web dashboard, no admin password, no database, no Redis, no Prisma, and no Mini App.

Stripe is optional. When enabled, the bot runs one small HTTP endpoint for Stripe webhooks so card payments can be confirmed before access opens.

## Commands

Regular users:

- `/start` - Enter Divine Deja
- `/menu` - Main Menu
- `/gallery` - Gallery
- `/voice` - Voice Notes
- `/gifts` - Gifts & Considerations
- `/spoil` - Spoil Me
- `/worship` - Worship gifts
- `/reup` - Reups
- `/always` - Deja Always
- `/topup` - Top Up Messages
- `/paysupport` - Payment status and support details
- `/links` - Official Links
- `/private` - Private Access
- `/rules` - Rules
- `/help` - Help
- `/voice_notes` - Voice Notes alias
- `/about` - Read the polished Divine Deja intro
- `/privacy` - Explain stored data
- `/myid` - Show your numeric Telegram ID for admin setup
- `/delete_my_data` - Remove the user from local JSON storage
- `/stop` - Opt out of broadcasts

Admins:

- `/admin` - Show admin commands
- `/stats` - Show simple stats
- `/analytics` - Show payment, access, and user analytics
- `/recent_payments [LIMIT]` - Show recent payments
- `/user_payments USER_ID` - Show one user's payments
- `/private_drop TIER Your message` - Preview and send a paid-tier private drop
- `/expire_access` - Mark stale memberships as expired
- `/broadcast Your message` - Preview and confirm a message to users who have not used `/stop`
- `/pending` - Show users waiting for top-up or access confirmation
- `/user_status USER_ID` - Show a user's access status
- `/approve_user USER_ID ACCESS_TYPE` - Approve `girlfriend`, `goddess`, or `vip` access
- `/add_credits USER_ID NUMBER` - Add message credits
- `/remove_access USER_ID` - Remove access and credits

Admin access is based only on numeric Telegram IDs in `ADMIN_TELEGRAM_ID` or `ADMIN_TELEGRAM_IDS`.

## Setup

1. Create a new bot with [@BotFather](https://t.me/BotFather).

2. Copy the example environment file:

```bash
cp .env.example .env
```

3. Add your bot token to `.env`:

```env
BOT_TOKEN=your_bot_token_here
BOT_USERNAME=DejaWorldBot
OWNER_TELEGRAM_USERNAME=dejaxx_a
OWNER_TELEGRAM_ID=
ADMIN_TELEGRAM_ID=
ADMIN_TELEGRAM_IDS=123456789
```

Use numeric Telegram IDs for admins. Usernames are not used for admin access.

Optional private door placeholders live in `.env.example`. Fill them only when you want those doors active:

- `CLIPS_LINK`
- `PREMIUM_LINK`
- `ONLYFANS_LINK`
- `FANSLY_LINK`
- `CUSTOMS_LINK`
- `THRONE_LINK`
- `CASHAPP_LINK`
- `WISHLIST_LINK`
- `GIFT_FORM_LINK`
- `SITE_SPOIL_LINK`
- `COFFEE_GIFT_LINK`
- `DRINKS_GIFT_LINK`
- `SNACK_GIFT_LINK`
- `FLOWERS_GIFT_LINK`
- `MANICURE_GIFT_LINK`
- `PEDICURE_GIFT_LINK`
- `GLAM_GIFT_LINK`
- `SHOPPING_GIFT_LINK`
- `VACATION_GIFT_LINK`
- `WORSHIP_100_LINK`
- `WORSHIP_250_LINK`
- `WORSHIP_500_LINK`
- `WORSHIP_1000_LINK`
- `WORSHIP_CUSTOM_LINK`
- `REUP_10_LINK`
- `REUP_25_LINK`
- `REUP_50_LINK`
- `REUP_100_LINK`
- `REUP_250_LINK`
- `REUP_MONTHLY_LINK`
- `TOPUP_PAYMENT_LINK`
- `TOPUP_10_PRICE`
- `TOPUP_10_STARS`
- `TOPUP_30_PRICE`
- `TOPUP_30_STARS`
- `TOPUP_60_PRICE`
- `TOPUP_60_STARS`
- `DAY_PASS_PRICE`
- `DAY_PASS_STARS`
- `GIRLFRIEND_ACCESS_PRICE`
- `GIRLFRIEND_ACCESS_STARS`
- `GIRLFRIEND_WEEKLY_PRICE`
- `GIRLFRIEND_WEEKLY_STARS`
- `GIRLFRIEND_MONTHLY_PRICE`
- `GIRLFRIEND_MONTHLY_STARS`
- `GODDESS_ACCESS_PRICE`
- `GODDESS_ACCESS_STARS`
- `VIP_DEJA_PRICE`
- `VIP_DEJA_STARS`
- `BOOKING_LINK`
- `PRIVATE_REQUEST_LINK`
- `CUSTOM_REQUEST_LINK`
- `CONTACT_LINK`
- `MAIN_WEBSITE_LINK`
- `EXPERIENCE_DEJA_LINK`
- `LINKME_LINK`
- `X_LINK`
- `INSTAGRAM_LINK`
- `REDDIT_LINK`
- `TELEGRAM_CHANNEL_LINK`

Optional Stripe Checkout variables:

- `STRIPE_CHECKOUT_ENABLED`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `STRIPE_WEBHOOK_PATH`
- `STRIPE_SUCCESS_URL`
- `STRIPE_CANCEL_URL`

Do not put real Stripe secrets in chat or commit them to Git. Add them only in `.env` locally or in Railway environment variables.

4. Install dependencies:

```bash
pnpm install
```

5. Run the bot locally:

```bash
pnpm dev
```

6. Open the bot:

```text
https://t.me/DejaWorldBot
```

Regular users simply message the bot and tap the inline buttons.

## Production Build

Build TypeScript:

```bash
pnpm build
```

Start the built bot:

```bash
pnpm start
```

## Storage

The bot stores simple JSON files in `data/`:

- `data/users.json` - local user records, stop status, mood, and basic timestamps
- `data/links.json` - official Divine Deja links

If these files are missing, the bot creates them automatically.

If you deploy to a host where files reset on redeploy, attach persistent storage or expect `data/users.json` to reset.

Stars payment history, Stripe payment history, last purchase, access keys, credits, lightweight room memory, and manual payment review requests are stored locally in `data/users.json`.

## Deja Always

After the 18+ acknowledgment, the bot now asks what mood the visitor wants before showing the full world.

`Deja Always` adds:

- girlfriend-style access
- goddess-style access
- VIP Deja access
- top-up message credits
- Telegram Stars checkout
- optional Stripe card checkout
- My Access / My Status
- Reup Same Package
- admin approval
- soft gated chatting when credits or access are available
- a protected 18+ paid-media doorway named `A More Intimate Look`

Top-ups and access checkout use Telegram Stars by default. Users pay through Telegram checkout, and the bot opens credits or access only after Telegram sends a confirmed payment event. The bot saves Telegram charge IDs so a confirmed payment cannot deliver the same credits or access twice.

Stripe card checkout can be enabled for brand-safe digital access offers. The bot creates Checkout Sessions from `src/offers.ts`, then opens credits or access only after Stripe sends a signed `checkout.session.completed` webhook with paid status. The bot saves Stripe Checkout Session IDs so a confirmed card payment cannot deliver the same credits or access twice.

Stripe product names are intentionally discreet but accurate, such as `Digital Message Credit Pack`, `Weekly Digital Companion Access`, and `VIP Digital Access`. Do not use Stripe for explicit adult content, explicit paid media, or anything that misrepresents what the customer receives.

CashApp, PayPal, and Venmo stay direct payment doors for girlfriend-style consideration, spoil options, worship gifts, reups, and Telegram-only special requests.

The direct payment doors are centralized in `src/stripeDoors.ts`. They appear as additional doors in girlfriend, private, entry, spoil, worship, and reup flows. They do not auto-unlock access. Users can send a manual review request with a note or screenshot, and admins can review those requests through `/pending`.

Paid offers are centralized in `src/offers.ts`. Edit offer titles, displayed dollar references, Stars amounts, Stripe-safe product names, credit amounts, and access durations there so the button text, Telegram invoice, and card checkout stay aligned.

For payment questions, users can send `/paysupport`. It shows their Telegram ID, current credits/access, last purchase, pending manual review status, and clear guidance for Stars, card checkout, and direct payments.

The bot uses Star amount placeholders like `TOPUP_10_STARS` and `GIRLFRIEND_MONTHLY_STARS`. The dollar copy is shown for clarity, but the in-bot charge itself is in Telegram Stars.

`A More Intimate Look` uses Telegram paid media. Its seven files live only in `assets/intimate`, are not part of the public gallery, and unlock for `INTIMATE_GALLERY_STARS` after a separate 18+ confirmation. The default is 750 Stars with `$15` shown as the display price. Telegram handles the purchase and media unlock directly.

`A More Intimate Look` is not eligible for Stripe Checkout in this codebase.

## Stripe Setup

Stripe is optional and should be used only for brand-safe digital access and message credit offers.

1. Set Railway environment variables:

```env
STRIPE_CHECKOUT_ENABLED=true
STRIPE_SECRET_KEY=your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=your_stripe_webhook_signing_secret
STRIPE_WEBHOOK_PATH=/stripe/webhook
STRIPE_SUCCESS_URL=https://t.me/DejaWorldBot?start=stripe_success
STRIPE_CANCEL_URL=https://t.me/DejaWorldBot?start=stripe_cancel
```

2. Keep `BOT_TOKEN`, `ADMIN_TELEGRAM_IDS`, and `DATA_DIR=/data` set as before.

3. In Stripe, add this webhook endpoint after the Railway service has a public domain:

```text
https://YOUR-RAILWAY-DOMAIN/stripe/webhook
```

4. Listen for:

```text
checkout.session.completed
```

5. Use the webhook signing secret from that exact endpoint as `STRIPE_WEBHOOK_SECRET`.

6. Do a small test purchase first. Access should open only after the webhook arrives.

Do not describe Stripe products as something false. Keep them discreet and safe, but accurate: digital message credits, digital companion access, premium digital access, VIP digital access, or similar brand-safe service language.

## Official Links

The default link list includes:

- Website: `https://divinedeja.com`
- Verified Links: `https://divinedeja.com/links`
- Watch Clips: `https://divinedeja.com/clips`
- VIP / Custom: `https://divinedeja.com/vip`
- Spoil Me: `https://divinedeja.com/spoil`
- Private Access: `https://divinedeja.com/access`
- Telegram: `https://t.me/dejaxx_a`
- Bot: `https://t.me/DejaWorldBot`
- X/Twitter: `https://x.com/spoildeja?s=20`
- OnlyFans: `https://onlyfans.com/tsdejavux`
- IWantClips: `https://iwantclips.com/store/1584177/Tsgoddessdeja`
- ManyVids: `https://www.manyvids.com/Profile/1008336502/tsdejavu/Store/Videos`
- Throne: `https://throne.com/goddessdejavux`
- CashApp: `https://cash.app/Dasiaamess`
- PayPal: `https://paypal.me/Darinamess`
- Venmo: `https://venmo.com/Dejjavu`

Edit `data/links.json` to add approved official URLs.

## Where To Edit Later

Open `src/editLater.ts` first.

That file has the clean insert areas for:

- new gallery pictures
- new voice notes
- new spoil/gift buttons
- new worship gift amounts
- new reup/top-up amounts
- optional doorway atmosphere for existing links
- the reference for the main direct website link

Gallery pictures go in `src/editLater.ts` between:

- `GALLERY_INSERT_AREA_START`
- `GALLERY_INSERT_AREA_END`

Voice notes go in `src/editLater.ts` between:

- `VOICE_NOTES_INSERT_AREA_START`
- `VOICE_NOTES_INSERT_AREA_END`

Spoil/gift button sections go in `src/editLater.ts` between:

- `SPOIL_INSERT_AREA_START`
- `SPOIL_INSERT_AREA_END`

Worship gift sections go in `src/editLater.ts` between:

- `WORSHIP_INSERT_AREA_START`
- `WORSHIP_INSERT_AREA_END`

Reup/top-up sections go in `src/editLater.ts` between:

- `REUP_INSERT_AREA_START`
- `REUP_INSERT_AREA_END`

Doorway atmosphere for existing links goes in `src/editLater.ts` between:

- `DOORWAY_INSERT_AREA_START`
- `DOORWAY_INSERT_AREA_END`

The main direct website destination is controlled by the `website` link in `data/links.json`. The private override name is `MAIN_WEBSITE_LINK` in `.env`.

The spoil, worship, and reup grids work like Telegram inline buttons. Emoji can be placed directly inside the button labels. Final outgoing buttons use Telegram URL buttons, which Telegram displays with the small arrow icon.

Reups are voluntary. The bot does not auto-charge anyone or quietly drain a balance. In-bot top-ups and instant access use Telegram Stars. CashApp, PayPal, and Venmo stay direct payment links for requests you personally handle.

The main goddess world copy, button flow, and placeholder mapping live in `src/worldConfig.ts`.

## Privacy

The bot only stores minimal Telegram interaction data needed for the experience:

- Telegram user ID
- Username, if available
- First name, if available
- Mood choice
- Current access type
- Message credits
- Membership status and expiration
- Last top-up or access request
- Admin approval status
- Stop/opt-out status
- Basic message count and timestamps

Users can remove their local bot data with `/delete_my_data`.

Users can opt out of broadcasts with `/stop`. Users who use `/stop` are excluded from `/broadcast`.

## Content Boundary

The bot stays non-explicit. It can feel stylish, romantic, mysterious, sensual, confident, worshipful, and premium, but it does not host explicit adult content or run explicit sexual roleplay.

Any premium or adult discovery should route to official approved external platforms through links.

## Creator Account Boundary

`@dejaxx_a` is the creator account.

This bot does not automate `@dejaxx_a`, log into it, read its messages, send messages from it, or control it in any way.

The bot only links users to that account through official links.
