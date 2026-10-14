# Notifications: channels, routing and bounds

This file holds the facts behind roadmap item 145, the mobile notifications and the chat on Telegram and Discord, which absorbed 146, the PWA install. The [roadmap](roadmap.md) holds its status. Sources: the [UX conversation](ai-software-factory-ux-conversation.md), ruling 256, the [board roadmap](board/roadmap.md), and Sebastian's discussion of 2026-10-13 on the chat over the messengers.

## What notifies

A push is something worth pulling a person back in. The pulse is awareness inside the factory, so routine agent activity never notifies. These events notify:

- you are needed,
- something important failed,
- the budget needs attention,
- a project or milestone is done.

A tap opens the mobile browser on the card that waits. The member answers and closes the phone.

The board roadmap's "Approvals on the phone" (old item 29: a push channel plus a small approval page, with [Nimbalyst](board/reports/nimbalyst.md)'s iOS path and Happy's push approvals as the field's proof) and architecture 10's "Approval on the phone" fold in here.

## The channels

The channels come in this order: Web Push, Telegram, Discord, WhatsApp.

- **Web Push** needs no app store and no developer programme. It works on iOS 16.4 and later for home-screen web apps, with the permission asked after an explicit user action, and on Android through Chrome and Firefox. It needs a service worker, the Push API and VAPID keys on the server. The installed PWA carries it.
- **Telegram**: the bot API is free, and a bot needs no phone number. The user starts the chat once, since a bot may not open one. Inline buttons can carry a choice straight back into the event stream. Inbound messages need a webhook on the gateway's public HTTPS or `getUpdates` long-polling.
- **Discord**: the bot API is free, and a bot needs no phone number. Two-way chat needs the Message Content Intent. One private server with one channel is the whole blast radius.
- **WhatsApp**: the Cloud API needs a Meta business setup and a verified sending number in production. A test number reaches five recipients in development. Since 1 July 2025 a business-initiated message outside the 24-hour window needs an approved template and may cost a fee per message.
- **Signal** has no official bot platform, and `signal-cli` is unofficial.

The two messenger accounts exist since 2026-10-13: the Telegram bot and the Discord application `ai-software-factory` (private, one bot user in a factory server). Their tokens and delivery targets are in the gitignored `.env.tools` (`TELEGRAM_BOT_KEY`, `TELEGRAM_CHAT_ID`, `DISCORD_BOT_TOKEN`, `DISCORD_CHANNEL_ID`). Both paths delivered a live test message, to the phone and to the server's channel.

## The chat over the messengers

The project conversation lives once, in the control plane. The messengers and the browser are windows onto it, so nothing ever syncs between the messengers.

- A binding table maps a project to chat addresses. The `.env.tools` pair is its first row.
- A reply goes to the venue of the human's last message.
- An escalation ping reaches every bound chat, as the channel preferences say.
- Routine chat never mirrors to every venue, since a delivered messenger message is a notification.
- The browser alone renders the whole transcript, so it never falls behind. A messenger holds only what was delivered to it, and "catch me up" pushes the last turns on demand.
- Messages typed at the same time interleave in arrival order in the one append-only transcript. The reply goes to the venue of the last message, and the desk window still shows it live.
- Approval buttons resolve in the control plane. The first press answers, and a later press on another venue hears "already answered".
- A turn longer than Telegram's 4096 or Discord's 2000 characters splits at paragraph boundaries, or is cut with a link to the card.

## The phone

Chrome on Android installs a PWA as a WebAPK that behaves like an installed app. No React Native: the factory stays the app. A board usable one-handed is table stakes after Trello and Linear (the board roadmap's "Mobile web pass").
