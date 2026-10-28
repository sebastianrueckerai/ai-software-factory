# Notifications: channels, routing and bounds

This file holds the facts behind roadmap item 145, the mobile notifications on Telegram and Discord, which absorbed 146, the PWA install. Sebastian ruled the messengers pagers on 2026-10-17: one line with a link, no chat and no answer buttons ([the plan](plans/2026-10-14-messenger-notifications.md)). The [roadmap](roadmap.md) holds its status. Sources: the [UX conversation](ai-software-factory-ux-conversation.md), ruling 256, the board roadmap (folded into the roadmap on 2026-10-28), and Sebastian's discussions of 2026-10-13 and 2026-10-17 on the messengers.

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
- **Telegram**: the bot API is free, and a bot needs no phone number. The user starts the chat once, since a bot may not open one. A notification carries one inline URL button, the link to the card. Inbound messages need a webhook on the console's public HTTPS.
- **Discord**: the bot API is free, and a bot needs no phone number. Delivery is one line with a link button; two-way chat is ruled out (2026-10-17), so the Message Content Intent is not needed. One private server with one channel is the whole blast radius.
- **WhatsApp**: the Cloud API needs a Meta business setup and a verified sending number in production. A test number reaches five recipients in development. Since 1 July 2025 a business-initiated message outside the 24-hour window needs an approved template and may cost a fee per message.
- **Signal** has no official bot platform, and `signal-cli` is unofficial.

The two messenger accounts exist since 2026-10-13: the Telegram bot and the Discord application `ai-software-factory` (private, one bot user in a factory server). Their tokens and delivery targets are in the gitignored `.env.tools` (`TELEGRAM_BOT_KEY`, `TELEGRAM_CHAT_ID`, `DISCORD_BOT_TOKEN`, `DISCORD_CHANNEL_ID`). Both paths delivered a live test message, to the phone and to the server's channel.

## The messengers are pagers

Sebastian ruled on 2026-10-17: the messenger delivers notifications, the console stays the one place to read and act. No chat runs over the messengers and no answer buttons ride a notification; the reasoning is in [the plan](plans/2026-10-14-messenger-notifications.md). The routing:

- A member connects each messenger once, not per project: Telegram through a deep link from the console, Discord through OAuth2.
- Per project, the member holds a level: off, needs you, or all. No level means a derived default: needs you in a project whose resolved notify list (the file's `notify` list, else the approvers) includes the member, off elsewhere.
- Questions, approvals and budget stops deliver at needs you. Failures and finishes deliver at all. Routine agent activity never notifies, since the pulse covers it.
- Delivery goes to every messenger the member connected, through an outbox that survives restarts. A settled ask is never sent, and a sent ask is edited with its reason word when it settles, the settling rule of roadmap 292.
- A project file may forbid messenger delivery with `messengers: false`, since bot chats are not end-to-end encrypted.
- A notification is `<project>: <row>` cut to the venue's length, with one link button to the card. A reply gets one fixed line with the console's address.

## The phone

Chrome on Android installs a PWA as a WebAPK that behaves like an installed app. No React Native: the factory stays the app. A board usable one-handed is table stakes after Trello and Linear (the board roadmap's "Mobile web pass").
