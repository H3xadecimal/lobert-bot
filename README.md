# Lobert Bot

A Discord game lobby butler that makes it easy to gather players for any game, right in your server. Lobert handles lobby creation, live join/leave buttons, roster updates, and “lobby full” pings so you can focus on playing, not coordinating.

---

## 🌟 Features

- **Slash commands**  
  - `/lobby create game:<name> size:<#>` — Create a new game lobby.  
  - `/lobby list` — Show all open lobbies.  
  - `/lobby cancel` — Cancel the lobby you created.

- **Interactive buttons**  
  - **Join** / **Leave** buttons on each lobby embed for one-click roster management.  
  - Embed updates in real time as players join or leave.

- **Auto-ping when full**
  - As soon as the player count reaches the lobby size, Lobert posts a “🚀 Lobby full!” message tagging everyone in that lobby.

- **Auto-expire**
  - Lobbies automatically close and their message is removed after 3 hours.

- **Multi-lobby support**  
  - Handle multiple lobbies across different games (or the same game) simultaneously.

---

## 🚀 Installation

1. **Clone this repository**  
   ```bash
   git clone https://github.com/deaddisc/lobert-bot.git
   cd lobert-bot
Install dependencies
npm install
Create your .env
In the project root, create a file named .env with:
DISCORD_TOKEN=your-bot-token
CLIENT_ID=your-application-id
GUILD_ID=your-server-id
Deploy slash commands (guild-scoped, updates instantly)
npm run deploy:cmd
Start the bot
npm run dev

## 🎮 Usage

1. Create a lobby
/lobby create game:Valorant size:5
Lobert will post an embed:

```embed
VALORANT lobby (1/5)
• @YourName (creator)
[ Join ]  [ Leave ]
Join / Leave
```
Click Join to add yourself to the roster.
Click Leave to remove yourself.

2. List open lobbies
/lobby list

```Replies (ephemeral):

• VALORANT (2/5) – @YourName
• League (1/3) – @AnotherUser
```

3. Cancel your lobby
/lobby cancel
Deletes the embed and removes your lobby.

4. Lobby full ping
When the last spot is filled, Lobert automatically sends:

```embed
🚀 Lobby full! @A @B @C @D @E
🛠️ Configuration & Deployment
```

## Environment variables
DISCORD_TOKEN — Your bot’s token from the Developer Portal.
CLIENT_ID — The Application (Client) ID.
GUILD_ID — The guild/server ID where you want instant command updates.

Docker / PM2
You can deploy the bot on Render or Railway for 24/7 uptime.

Persistence
Currently in-memory; for lobby persistence across restarts, integrate a database (e.g., SQLite or Redis).

📄 License & Credits
Maintained by
• Deaddisc / Neron
• Aeris (ChatGPT)

---

## Dev's To-do list of Features & Bug-fixes
- ~~Modify the /lobby list command so that it publically(not just the "only you can see this" messages) prints out all the opened lobbies' embed with the join/leave buttons instead of just a list. (People need to keep scrolling up to find the embed and click join/leave)~~
  - Done: `/lobby list` now republishes each lobby's embed with join/leave buttons in the channel.

## Scheduled lobby pings

Use `/lobby create game:Valorant size:5 time:21:00` to ping the current
lobby roster at the next 21:00 **Mauritius time (Indian/Mauritius, UTC+04:00)**, regardless of the server timezone. Mauritius does not currently observe daylight saving time. To override the default UTC offset, use
`time:21:00+04:00` or `time:21:00-05:00`. Offsets are fixed; adjust them for
daylight saving time when needed. Times already reached today mean tomorrow.
The embed shows the start in each Discord viewer's local timezone.

Scheduled lobbies expire three hours **after their start**, so a start more
than three hours away is not silently cancelled. Cancelling a lobby cancels
its ping. The existing lobby-full notification is independent of the start ping.
Lobbies and timers remain in memory: restarting/stopping the bot loses them.

After updating, run `npm run build`, redeploy slash commands with
`npm run deploy:cmd`, and restart the bot. Run `npm test` for regression tests.
