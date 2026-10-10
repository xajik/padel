# Product Hunt launch kit: Americanoo

Everything for the Product Hunt submission: field copy, gallery, thumbnail, video, maker comment and
launch-day posts. The story has three pillars: **every device** (iPhone, Android, Apple Watch, Wear OS, web),
**AI agents** (the MCP server) and **multiplayer** (one live game the whole group scores). Tone: playful,
short, emoji where they carry meaning. Claims follow
`store/STORE_LISTING.md`, `docs/MOBILE.md` and the code; keep them in sync.

| Asset | File | Notes |
|---|---|---|
| Thumbnail | `thumbnail.png` | 480×480 (2× of PH's 240×240), logo on black |
| Gallery (upload in order) | `gallery/01-hero.png` … `08-free.png` | 2540×1520 (2× of PH's 1270×760) |
| Promo video | `video/americanoo-promo.mp4` | 1920×1080, 43 s, no audio. PH takes a YouTube link: upload it there first |
| Social cards | `social/launch-x.png` (1200×675), `social/launch-square.png` (1080×1080) | For X, LinkedIn, Instagram, WhatsApp groups |
| Sources | `src/*.html`, `render.sh`, `make-video.sh` | `./render.sh` re-renders every image, `./make-video.sh` rebuilds the video |

Before submitting, check:

- [ ] **Store links (blocking for this story).** `NATIVE_APP.appStoreUrl` / `playStoreUrl` in
      `apps/web/lib/site.ts` are still `null`. A phones-and-watches launch needs the iPhone app (with the
      Apple Watch app) and the Android app (with Wear OS) live, or visitors will land on "coming soon".
      Launch after both stores approve, and add both links to the PH form.
- [ ] The web FAQ on `/` still says Google sign-in is "coming soon"; the store copy says it works. Fix one before traffic arrives.
- [ ] `make smoke URL=https://padel-americanoo.com` passes on launch morning, and a cross-device game
      (`make e2e-local`, or by hand: iPhone → Android → web) still syncs.
- [ ] YouTube video is public or unlisted, and its link is pasted into the PH video field.

---

## Submission fields

**Name** (40 max)

```
Americanoo: Padel for friends & agents
```

**Tagline** (60 max). Recommended first.

```
One padel game. Any phone, browser, watch or AI agent
```

Alternatives:

```
Fire the scorekeeper: padel on every phone, watch and agent
Padel night, minus the whiteboard
```

**Description** (500 max)

```
Padel night, minus the whiteboard. 🎾

Start an Americano in 30 seconds, flash a QR code, and the whole group is in: iPhone, Android, web, even your wrist.

👯 "Everyone can edit": whoever finishes first enters the score
⌚ Apple Watch & Wear OS: spin the crown, tap Save
🤖 Tell your AI agent "set up an Americano for these 8" and it's done (MCP)
📶 Club Wi-Fi died? Scores wait and sync
⚖️ 8 formats, fair rotations

Free. No ads. No sign-up.
```

**Short description** (if the form asks for 260 max)

```
Padel night, minus the whiteboard 🎾 Flash a QR code and the whole group plays one live game on iPhone, Android, the web, Apple Watch, Wear OS, or through your AI agent. Everyone can enter scores. Free, no ads, no sign-up.
```

**Topics** (pick 3): Sports · Wearables · Artificial Intelligence

**Pricing:** Free

**Links**

| Field | URL |
|---|---|
| Website | https://padel-americanoo.com |
| App Store | add when live |
| Google Play | add when live |
| MCP docs (put in the maker comment) | https://padel-americanoo.com/docs/mcp |

### Gallery order and alt text

| # | File | Alt text |
|---|---|---|
| 1 | `01-hero.png` | One padel game on iPhone, Android, Apple Watch, Wear OS, the web and AI agents |
| 2 | `02-join.png` | Friends join by QR code, code or screenshot; "Everyone can edit" lets the whole group score |
| 3 | `03-live.png` | Score on one phone and the leaderboard updates on every phone and browser |
| 4 | `04-watch.png` | Score with the crown, start the next round and start again on Apple Watch and Wear OS |
| 5 | `05-agent.png` | An AI agent creates the game, enters scores and starts the next round over MCP |
| 6 | `06-fair.png` | A real 9-player schedule: every pair partners exactly once, everyone sits out once |
| 7 | `07-formats.png` | Eight social padel formats, from Americano to Team Up & Down |
| 8 | `08-free.png` | Free, no ads, no account: padel-americanoo.com |

Poster 6 is real engine output: `createGame(defaultSettings('americano', 9), players, 'producthunt')`.
The iPhone and Android screenshots come from separate demo games (codes AC7KJP and TF9HG7), so the posters
never present them as one game side by side.

---

## Maker's first comment

Post it the moment the launch goes live. Fill in or delete the bracketed parts.

```
Hey Product Hunt 👋

I'm Igor. Every [Sunday] my padel group plays Americano: partners rotate every round, everyone keeps their team's points, highest total wins. And every week one unlucky person became The Scorekeeper 📋, guarding a whiteboard while everyone else shouted "who am I playing next?!"

So I fired the scorekeeper. Americanoo makes the whole group the scorekeeper:

📲 Start a game in 30 seconds, flash a QR code, and everyone's in the same live game. No account, no install for friends; a browser works.
👯 Flip "Everyone can edit" and whoever finishes their match enters the score and starts the next round.
⌚ Hands sweaty? Spin the crown on Apple Watch or Wear OS, tap Save. The other pair gets the rest of the points automatically.
🍎🤖🌐 iPhone, Android, both watches and the web all play the same game. Mixed groups just work.
🧠 Too lazy to tap at all? Connect our free MCP server and tell your AI agent "set up an Americano for these 8 on 2 courts". It builds the schedule, sends the link, enters scores you dictate and reads out the leaderboard.
📶 Club Wi-Fi is a potato? Scores wait offline and sync when you're back.

Plus 8 formats (Americano, Mexicano, Beat the Box, Up & Down…) with genuinely fair rotations: nobody sits out twice before everyone has sat out once.

Free. No ads. No sign-up. Just padel. 🎾

Tell me: what's the most chaotic thing that's happened at your padel night? And which device are you scoring from?

padel-americanoo.com · MCP setup: padel-americanoo.com/docs/mcp
```

---

## Launch-day posts

**X / Threads** (with `social/launch-x.png`)

```
I fired our padel scorekeeper 📋❌

Americanoo is live on Product Hunt 🎾
📲 QR code → the whole group in one live game
⌚ Score from Apple Watch & Wear OS
🤖 Or tell your AI agent to run it (MCP)
iPhone · Android · web. Free, no sign-up.

[PH link]
```

**LinkedIn** (with `social/launch-x.png`)

```
Today I launched Americanoo on Product Hunt 🎾

Every social padel night has a scorekeeper: one person with a whiteboard, everyone else asking who they play next. I wanted to get rid of that job.

Americanoo makes the whole group the scorekeeper:
→ Start a game in 30 seconds, show a QR code, and everyone joins the same live game
→ "Everyone can edit": whoever finishes a match enters the score
→ Works on iPhone, Android, the web, Apple Watch and Wear OS, all in one game
→ A free MCP server, so an AI agent can set up and run the whole thing

Under the hood: one scheduling engine shared across platforms with Kotlin Multiplatform, offline sync for terrible club Wi-Fi, and a remote MCP server on Cloudflare.

Free, no ads, no sign-up. I'd love your feedback on Product Hunt: [PH link]
```

**Padel group chats / WhatsApp** (with `social/launch-square.png`)

```
Remember the whiteboard? 😅 The app we use for our Americano nights is on Product Hunt today. If you've scored a game from your phone or watch, a comment there would mean a lot 🙏 [PH link]
```

Product Hunt counts organic engagement: ask people to check it out and comment, not to "upvote". Don't share
a direct upvote link in bulk, and don't post in subreddits (r/padel bans self-promotion); answer threads instead.

**Reply to people who support you**

```
Thank you! 🎾 If you play this week, flip "Everyone can edit" and tell me who turned out to be the worst scorekeeper.
```

---

## Prepared replies

**Can iPhone and Android players be in the same game?**
> Yes. iPhone, Android, both watches and the website all open the same live game by QR code, 6-letter code
> or link. Nobody needs an account, and friends without the app can follow in any browser.

**Who can enter scores?**
> By default only the organizer; everyone else follows. Flip "Everyone can edit" in the share sheet and the
> QR code and link switch to the editing link, so anyone who joins with it can enter scores and start the next round.

**Does the watch need the phone?**
> The watch app runs the game itself and syncs with our servers over the watch's Wi-Fi or LTE, or through the
> phone's connection, so the phone app doesn't have to be open. Games started on the watch show up on the phone,
> editable, and the other way round. Without any signal, edits wait and sync later.

**How does watch scoring work?**
> Tap a court, turn the crown to the first pair's points and tap Save; the other pair gets the rest
> (24 → 14 + 10). For first-to-N games you pick the winner, then the loser's points.

**Can I start a game from the watch?**
> You can start again with one of your last five groups (same players and settings) from the watch.
> Setting up a brand-new group happens on the phone.

**How fast do other phones update?**
> Within a few seconds while the game is open. Live Activity, widgets and the Android notification update
> while the app is running; updates with the app fully closed need push notifications, which are on the list.

**Is it really free?**
> Yes: no ads, no subscriptions, no in-app purchases. I built it for my own group first.

**Odd number of players?**
> Sit-outs rotate: nobody sits out twice before everyone has sat out once, and not twice in a row when it can be
> avoided. Sit-outs can also get the average score so nobody loses out.

**What about my data?**
> Without an account the apps use an anonymous ID. Analytics never include player names or scores, there's no ad
> ID or cross-app tracking, and games on our servers are deleted 90 days after the last change. Details: padel-americanoo.com/privacy

**Can an AI assistant run it?**
> Yes, there's a free MCP server: connect `padel-americanoo.com/mcp` and ask it to set up a game. Setup:
> padel-americanoo.com/docs/mcp

**Languages?**
> English for now. Tell me which language your group needs.
