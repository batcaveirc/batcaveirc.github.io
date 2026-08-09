# 🦇 BatCave Vampire Bot - GitHub Actions Setup Guide

This guide explains how to run the BatCave Vampire Bot on GitHub Actions with minimal downtime.

## ⚠️ Important Limitations

- **6-Hour Timeout**: GitHub Actions jobs automatically terminate after 6 hours
- **5-Minute Gaps**: The bot will restart within 5 minutes after each timeout (scheduled runs every 5 minutes)
- **No Persistent State**: Warnings, economy, and other stored data resets on each restart
- **Stateless Operation**: This is a lightweight version focusing on core commands and personality

## 📋 Required GitHub Repository Secrets

Go to your GitHub repo → Settings → Secrets and variables → Actions → New repository secret

Add these secrets:

| Secret Name | Description | Example Value |
|-------------|-------------|---------------|
| `IRC_SERVER` | IRC server hostname | `irc.hybridirc.com` |
| `IRC_PORT` | IRC server port | `6667` or `6697` (TLS) |
| `IRC_NICK` | Your bot's nickname | `Vampire` or `Dracula` |
| `IRC_REALNAME` | Real name shown in WHOIS | `BatCave Vampire Bot` |
| `IRC_CHANNEL` | Channel(s) to join | `#batcave` (comma-separated for multiple) |
| `NICKSERV_PASS` | NickServ password | `your_password_here` |
| `NICKSERV_ACCOUNT` | NickServ account (if different from nick) | `Vampire` (optional) |
| `NICKSERV_GHOST_ON_CONNECT` | Ghost stuck sessions before identifying | `true` or `false` |
| `OWNERS` | Comma-separated list of owner nicks | `yournick,otherowner` |
| `ADMINS` | Comma-separated list of admin nicks | `admin1,admin2` |

## 🚀 Enabling the Workflow

1. **Push to GitHub**: Make sure all files are committed and pushed to the `main` branch
2. **Enable Workflows**: Go to Actions tab → Click "I understand my workflows, go ahead and enable them"
3. **Verify Secrets**: Double-check all secrets are set correctly
4. **First Run**: The bot will start automatically on next scheduled run (within 5 minutes) or you can manually trigger via "Run workflow" button

## 📂 Files Created

```
.github/
└── workflows/
    └── batcave-bot.yml      # GitHub Actions workflow configuration

batcave-bot/
├── action-bot.js            # Lightweight Node.js bot (Vampire personality)
└── package.actions.json     # Dependencies for GitHub Actions version
```

## 🎯 Features Included

### Core Commands
- `!ping` - Check bot latency and uptime
- `!help` - Show command list
- `!rules` - Display channel rules
- `!status` - Bot status info
- `!personality` - Show current persona traits

### Fun Emotes (30+)
- `!hug`, `!slap`, `!bite`, `!kiss`, `!pat`, `!boop`, `!bonk`
- `!dance`, `!flirt`, `!roast`, `!tease`, `!compliment`
- `!highfive`, `!fistbump`, `!wave`, `!salute`, `!bow`
- And many more...

### Games
- `!8ball` - Ask the dark oracle
- `!roll` / `!d20` - Roll dice
- `!flip` - Flip a coin
- `!rps` - Rock Paper Scissors

### Admin Commands (Owners/Admins only)
- `!say <message>` - Make bot speak
- `!kick <nick> [reason]` - Kick a user
- `!warn <nick>` - Warn a user (3 warnings = auto-kick)
- `!warnings <nick>` - Check warning count

### Auto-Responses
- Welcomes new users joining the channel
- Responds when mentioned by nickname
- Natural language admin commands (e.g., "mute the room", "op Nick")

### Vampire Personality
- Dynamic persona traits (humor, formality, energy, attitude, quirk)
- Gothic/mysterious response style
- No consecutive trait repeats
- Context-aware responses

## ❌ Features Excluded (Stateless Limitation)

These features from the original Python bot are NOT included because they require persistent storage:

- Discord bridge (requires persistent socket + Discord token)
- Warning persistence (resets on restart)
- Economy/score system
- Custom quotes/tags
- Seen tracking across sessions
- Long-running timers (reminders, giveaways)
- ChanServ integration beyond basic MODE commands
- Mass kick/ban operations
- NSFW gating system

## 🔧 Troubleshooting

### Bot not connecting
1. Check IRC_SERVER and IRC_PORT are correct
2. Verify NICKSERV_PASS is correct
3. Check Actions logs for error messages

### Nick already in use
- Set `NICKSERV_GHOST_ON_CONNECT` to `true`
- Ensure NICKSERV_PASS is correct
- The bot will try to GHOST and recover the nick

### Multiple bot instances
- The `concurrency` setting should prevent this
- If it happens, check that overlapping runs are being cancelled

### Scheduled runs not triggering
- GitHub may disable schedules after 60 days of repo inactivity
- Push a commit or manually trigger to re-enable
- Check Actions tab for any error messages

### Job timing out before 6 hours
- Check logs for errors
- May be due to IRC connection issues
- Bot will auto-reconnect on next scheduled run

## 📊 Expected Behavior

```
[Minute 0]   → Job starts, bot connects, joins channel
[Minute 0-360] → Bot operates normally
[Minute 360] → GitHub terminates job (6-hour limit)
[Minute 360-365] → Bot offline (gap)
[Minute 365] → Next scheduled run starts, bot reconnects
```

**Expected uptime**: ~99% (5 min gap every 6 hours = ~1.4% downtime)

## 🔐 Security Notes

- ✅ All credentials stored as GitHub Secrets (not in code)
- ✅ Repository should be PRIVATE to prevent code access
- ✅ No hardcoded passwords or tokens
- ⚠️ GitHub employees can still access private repos
- ⚠️ Running 24/7 services on Actions may violate ToS (use at own risk)

## 🆘 Support

If you encounter issues:
1. Check the Actions tab logs for error messages
2. Verify all secrets are set correctly
3. Test locally first: `cd batcave-bot && npm install && node action-bot.js`
4. Consider alternative hosting (Oracle Cloud Free Tier, local device with PM2)

---

**Remember**: This is a lightweight, stateless version designed for GitHub Actions. For full features, run the original Python bot (`batbot.py`) locally or on a VPS.
