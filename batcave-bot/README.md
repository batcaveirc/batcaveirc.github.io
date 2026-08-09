# 🦇 BatCave Bot

IRC bot for The BatCave chat room on HybridIRC with web integration.

## Features

- **Welcome Messages**: Greets new users joining #batcave
- **Command Responses**: Handles !help, !radio, !rules, !welcome, !ping
- **Radio Status**: Shares current radio status
- **Moderation Helpers**: Admin commands for kick, say, radio update
- **Web Integration**: REST API and WebSocket support for web interface
- **Auto-Reconnect**: Automatically reconnects on network errors

## Setup

### 1. Install Dependencies

```bash
cd batcave-bot
npm install
```

### 2. Configure Environment Variables (Optional)

Create a `.env` file or set environment variables:

```bash
BOT_NICK=BatCaveBot
BOT_CHANNEL=#batcave
NICKSERV_PASS=your_nickserv_password
ADMIN_NICK=your_admin_nick
PORT=3000
```

### 3. Run the Bot Server

```bash
# Start the full server with web integration
npm start

# Or run in development mode with auto-reload
npm run dev

# Or run just the IRC bot without web server
npm run bot-only
```

The server will start on `http://localhost:3000` by default.

## API Endpoints

### GET /api/status
Returns bot connection status.

```json
{
  "connected": true,
  "nick": "BatCaveBot",
  "channels": ["#batcave"],
  "radioStatus": "New Bollywood mix playing",
  "uptime": 12345.67
}
```

### GET /api/radio
Returns current radio status.

### POST /api/radio
Update radio status (admin only).

```json
{
  "status": "New playlist loaded"
}
```

### POST /api/command
Execute a bot command.

```json
{
  "cmd": "say",
  "args": ["Hello everyone!"],
  "channel": "#batcave"
}
```

### POST /api/say
Send a message to the channel.

```json
{
  "message": "Hello from the web interface!",
  "channel": "#batcave"
}
```

### GET /api/users
Get list of users in a channel.

## WebSocket API

Connect to `ws://localhost:3000` for real-time updates.

### Events Received

- `init`: Initial connection state
- `connected`: Bot connected to IRC
- `disconnected`: Bot disconnected
- `join`: User joined channel
- `part`: User left channel
- `quit`: User quit IRC
- `message`: New message in channel
- `command_response`: Bot response to command
- `mention`: Bot mentioned by user
- `admin_action`: Admin command executed
- `radio_update`: Radio status changed
- `error`: Error occurred

### Example WebSocket Client

```javascript
const ws = new WebSocket('ws://localhost:3000');

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log('Received:', data);
  
  switch(data.type) {
    case 'join':
      console.log(`${data.nick} joined ${data.channel}`);
      break;
    case 'message':
      console.log(`<${data.from}> ${data.text}`);
      break;
  }
};
```

## Bot Commands

Users can use these commands in the IRC channel:

- `!help` - Show available commands
- `!radio` - Get current radio status
- `!rules` - Show channel rules
- `!welcome` - Get welcome message
- `!ping` - Check if bot is alive

## Admin Commands

Admin users (configured via ADMIN_NICK) can use:

- `!admin radio <status>` - Update radio status
- `!admin say <message>` - Make bot say something
- `!admin kick <user> [reason]` - Kick a user

## File Structure

```
batcave-bot/
├── server.js          # Main server with web integration
├── batcave-bot.js     # Standalone IRC bot
├── package.json       # Dependencies and scripts
├── README.md          # This file
└── node_modules/      # Dependencies
```

## Deployment

### Using PM2 (Production)

```bash
npm install -g pm2
pm2 start server.js --name batcave-bot
pm2 save
pm2 startup
```

### Using Docker

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3000
CMD ["node", "server.js"]
```

### Environment Variables for Production

- `BOT_NICK`: Bot's IRC nickname
- `BOT_CHANNEL`: Channel(s) to join
- `NICKSERV_PASS`: NickServ password for identified nick
- `ADMIN_NICK`: Admin's IRC nickname
- `PORT`: HTTP server port (default: 3000)

## Troubleshooting

### Bot won't connect
- Check IRC server status (irc.hybridirc.com:6697)
- Verify firewall allows outbound connections on port 6697
- Check if NickServ password is correct

### WebSocket not connecting
- Ensure server is running on correct port
- Check CORS settings if accessing from different domain
- Verify firewall allows connections on HTTP port

## License

MIT

## Support

For issues or questions, join #batcave on HybridIRC or open an issue on GitHub.
