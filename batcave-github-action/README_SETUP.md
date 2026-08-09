# BatCave Bot - GitHub Actions Setup

## ⚠️ CRITICAL REQUIREMENT: PUBLIC REPO FOR FREE HOSTING

To run this bot 24/7 for **FREE**, your GitHub Repository **MUST be PUBLIC**.

- **Private repos**: Only 2,000 minutes/month (bot dies after ~1.5 days each month)
- **Public repos**: Unlimited free minutes
- **Security**: Your passwords/secrets are stored in GitHub Secrets and are **NEVER** visible in the code, even if the repo is public

## Setup Steps

### 1. Copy Files to Your Project

Copy the entire `batcave-github-action` folder structure to your local machine:
```
your-project/
├── batcave-bot/
│   ├── action-bot.js
│   └── package.json
└── .github/
    └── workflows/
        └── batcave-bot.yml
```

### 2. Initialize Git and Push

```bash
cd your-project
git init
git add .
git commit -m "Add BatCave bot for GitHub Actions"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/batcave-bot.git
git push -u origin main
```

### 3. Make Repo Public

1. Go to your repository on GitHub
2. Click **Settings** tab
3. Scroll to **Danger Zone**
4. Click **Change visibility** → **Make public**
5. Confirm

### 4. Add Repository Secrets

Go to **Settings** → **Secrets and variables** → **Actions** → **New repository secret**:

| Secret Name | Value Example |
|-------------|---------------|
| `IRC_SERVER` | `irc.hybridirc.com` |
| `IRC_PORT` | `6667` |
| `IRC_NICK` | `Vampire` (your bot's nick) |
| `IRC_REALNAME` | `BatCave Vampire Bot` |
| `NICKSERV_PASS` | `YourActualNickServPassword` |
| `IRC_CHANNEL` | `#batcave` |
| `OWNERS` | `your_nick,other_owner` (comma-separated, lowercase) |
| `ADMINS` | `admin_nick1,admin_nick2` |

**Important**: Never commit these values to code. Only paste them in the GitHub Secrets UI.

### 5. Enable Workflows

1. Go to **Actions** tab
2. Click **"I understand my workflows, go ahead and enable them"**
3. Wait ~5 minutes for the first scheduled run
4. Check the logs to confirm the bot connected

## Limitations

- **Downtime**: Bot disconnects every 6 hours (GitHub limit) and reconnects within 5 minutes (~99% uptime)
- **State**: No persistent memory (warnings, economy reset on restart)
- **Policy**: Uses GitHub Actions for hosting (technically against strict CI/CD intent but widely tolerated)

## Security Checklist

✅ No hardcoded secrets in code
✅ All credentials via GitHub Secrets
✅ No Discord bridge code (IRC-only)
✅ Graceful shutdown on SIGTERM
✅ NickServ authentication via environment variable

## Troubleshooting

**Bot not connecting?**
- Check Actions logs for errors
- Verify IRC_SERVER and NICKSERV_PASS are correct
- Ensure workflow is enabled

**Nick already in use?**
- Bot will automatically try `Vampire_` if taken
- Or kick the stuck session if you have GHOST enabled on IRC

**Scheduled runs delayed?**
- GitHub may delay cron jobs under load (10-30 min)
- Manual trigger via Actions tab forces immediate start
