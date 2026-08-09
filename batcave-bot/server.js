#!/usr/bin/env node
/**
 * BatCave Bot Server - Express backend for IRC Bot integration
 * 
 * This server:
 * - Runs the IRC bot connection
 * - Provides REST API for web interface
 * - Enables WebSocket communication for real-time updates
 */

const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');
const irc = require('irc');

// Configuration
const CONFIG = {
  server: 'irc.hybridirc.com',
  port: 6697,
  secure: true,
  nick: process.env.BOT_NICK || 'BatCaveBot',
  channels: [process.env.BOT_CHANNEL || '#batcave'],
  nickservPassword: process.env.NICKSERV_PASS || '',
  adminNick: process.env.ADMIN_NICK || '',
  httpPort: process.env.PORT || 3000,
};

// Bot state
let radioStatus = 'New Bollywood mix playing';
let isConnected = false;
let client = null;

// Welcome messages
const welcomeMessages = [
  "Welcome to The BatCave! 🦇 Pick a name and join the coven.",
  "The night owls gather here. Make yourself at home! 🦇",
  "🦇 Welcome! No account needed, just chat!",
];

// Commands the bot responds to
const commands = {
  help: () => `
    BatCave Bot Commands:
    !radio - Get current radio status
    !rules - Show channel rules
    !welcome - Get welcome message with link
    !ping - Check if bot is alive
  `,
  
  radio: () => `📻 ${radioStatus} - Tune in at the BatCave page!`,
  
  rules: () => `
    🦇 BatCave Rules:
    1. Be respectful to all coven members
    2. No spam or self-promotion
    3. Keep it SFW
    4. Have fun!
  `,
  
  welcome: () => `
    🦇 Welcome to The BatCave!
    Join the live chat: https://batcave.chat
    No account needed - just pick a name and dive in!
  `,
  
  ping: () => 'Pong! 🦇',
};

// Create Express app
const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, '..')));

// Track connected WebSocket clients
const wsClients = new Set();

// Broadcast to all WebSocket clients
function broadcast(data) {
  const message = JSON.stringify(data);
  wsClients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
}

// Create IRC client
function createIRCClient() {
  client = new irc.Client(
    CONFIG.server,
    CONFIG.nick,
    {
      userName: CONFIG.nick.toLowerCase(),
      realName: 'BatCave Bot',
      port: CONFIG.port,
      secure: CONFIG.secure,
      selfSigned: false,
      certExpired: false,
      floodProtection: true,
      floodProtectionDelay: 200,
      channels: CONFIG.channels,
      saslPassword: CONFIG.nickservPassword || undefined,
    }
  );

  // Event handlers
  client.on('registered', (message) => {
    isConnected = true;
    console.log(`[${new Date().toISOString()}] Connected to ${CONFIG.server}`);
    console.log(`Joined channels: ${CONFIG.channels.join(', ')}`);
    broadcast({ type: 'connected', message: 'Bot connected to IRC' });
    
    // Identify with NickServ if password provided
    if (CONFIG.nickservPassword) {
      client.say('NickServ', `IDENTIFY ${CONFIG.nick} ${CONFIG.nickservPassword}`);
    }
  });

  client.on('join', (channel, nick) => {
    if (nick === CONFIG.nick) {
      console.log(`[${new Date().toISOString()}] Joined ${channel}`);
      return;
    }
    
    // Welcome new users (randomly choose a message)
    const welcomeMsg = welcomeMessages[Math.floor(Math.random() * welcomeMessages.length)];
    client.say(channel, `${welcomeMsg} @${nick}`);
    
    console.log(`[${new Date().toISOString()}] Welcomed ${nick} in ${channel}`);
    broadcast({ type: 'join', channel, nick, message: `${welcomeMsg} @${nick}` });
  });

  client.on('part', (channel, nick, reason) => {
    console.log(`[${new Date().toISOString()}] ${nick} left ${channel}: ${reason || ''}`);
    broadcast({ type: 'part', channel, nick, reason });
  });

  client.on('quit', (nick, reason, channels) => {
    console.log(`[${new Date().toISOString()}] ${nick} quit: ${reason || ''}`);
    broadcast({ type: 'quit', nick, reason });
  });

  client.on('message', (from, to, text) => {
    const channel = to.startsWith('#') ? to : from;
    console.log(`[${new Date().toISOString()}] <${from}> ${text}`);
    
    // Only respond to commands in channels, not private messages
    if (!to.startsWith('#')) return;
    
    // Check for commands
    if (text.startsWith('!')) {
      const parts = text.slice(1).split(' ');
      const cmd = parts[0].toLowerCase();
      const args = parts.slice(1);
      
      if (commands[cmd]) {
        const response = commands[cmd](args);
        if (response) {
          // Split long messages
          const lines = response.trim().split('\n').map(l => l.trim()).filter(l => l);
          lines.forEach(line => {
            client.say(channel, line);
          });
          broadcast({ type: 'command_response', from, cmd, response: lines });
        }
      }
    }
    
    // Respond to mentions
    if (text.includes(CONFIG.nick) && !text.startsWith('!')) {
      const greetings = ['hello', 'hi', 'hey', 'sup', 'yo'];
      const hasGreeting = greetings.some(g => text.toLowerCase().includes(g));
      
      if (hasGreeting) {
        const greeting = `Hey @${from}! 🦇`;
        client.say(channel, greeting);
        broadcast({ type: 'mention', from, greeting });
      }
    }
    
    // Admin commands (if adminNick is set)
    if (from === CONFIG.adminNick && text.startsWith('!admin ')) {
      const adminCmd = text.slice(7).split(' ');
      
      if (adminCmd[0] === 'radio' && adminCmd[1]) {
        radioStatus = adminCmd.slice(1).join(' ');
        const msg = `📻 Radio status updated: ${radioStatus}`;
        client.say(channel, msg);
        broadcast({ type: 'admin_action', action: 'radio_update', status: radioStatus });
      }
      
      if (adminCmd[0] === 'say' && adminCmd[1]) {
        const msg = adminCmd.slice(1).join(' ');
        client.say(channel, msg);
        broadcast({ type: 'admin_action', action: 'say', message: msg });
      }
      
      if (adminCmd[0] === 'kick' && adminCmd[1]) {
        const kickMsg = `Kicking ${adminCmd[1]}...`;
        client.say(channel, kickMsg);
        client.raw(`KICK ${channel} ${adminCmd[1]} :${adminCmd.slice(2).join(' ') || 'Violating coven rules'}`);
        broadcast({ type: 'admin_action', action: 'kick', target: adminCmd[1] });
      }
    }
    
    // Broadcast all messages to WebSocket clients
    broadcast({ type: 'message', from, to, text, channel });
  });

  client.on('error', (error) => {
    console.error(`[${new Date().toISOString()}] Error:`, error);
    broadcast({ type: 'error', error: error.message });
  });

  client.on('netError', (error) => {
    console.error(`[${new Date().toISOString()}] Network Error:`, error.message);
    isConnected = false;
    broadcast({ type: 'disconnected', error: error.message });
    console.log('Attempting to reconnect in 10 seconds...');
    setTimeout(() => {
      try {
        client.connect();
      } catch (e) {
        console.error('Reconnection failed:', e);
      }
    }, 10000);
  });

  return client;
}

// API Routes
app.get('/api/status', (req, res) => {
  res.json({
    connected: isConnected,
    nick: CONFIG.nick,
    channels: CONFIG.channels,
    radioStatus,
    uptime: process.uptime(),
  });
});

app.get('/api/radio', (req, res) => {
  res.json({ status: radioStatus });
});

app.post('/api/radio', (req, res) => {
  const { status } = req.body;
  if (status) {
    radioStatus = status;
    if (client && isConnected) {
      client.say(CONFIG.channels[0], `📻 Radio status updated: ${radioStatus}`);
    }
    broadcast({ type: 'radio_update', status: radioStatus });
    res.json({ success: true, status: radioStatus });
  } else {
    res.status(400).json({ error: 'Status required' });
  }
});

app.post('/api/command', (req, res) => {
  const { cmd, args, channel } = req.body;
  
  if (!cmd) {
    return res.status(400).json({ error: 'Command required' });
  }
  
  if (commands[cmd]) {
    const response = commands[cmd](args || []);
    if (client && isConnected) {
      const targetChannel = channel || CONFIG.channels[0];
      const lines = response.trim().split('\n').map(l => l.trim()).filter(l => l);
      lines.forEach(line => {
        client.say(targetChannel, line);
      });
      broadcast({ type: 'command_executed', cmd, response: lines, channel: targetChannel });
      res.json({ success: true, response: lines });
    } else {
      res.status(503).json({ error: 'Bot not connected' });
    }
  } else {
    res.status(404).json({ error: 'Command not found' });
  }
});

app.post('/api/say', (req, res) => {
  const { message, channel } = req.body;
  
  if (!message) {
    return res.status(400).json({ error: 'Message required' });
  }
  
  if (client && isConnected) {
    const targetChannel = channel || CONFIG.channels[0];
    client.say(targetChannel, message);
    broadcast({ type: 'bot_message', message, channel: targetChannel });
    res.json({ success: true });
  } else {
    res.status(503).json({ error: 'Bot not connected' });
  }
});

app.get('/api/users', (req, res) => {
  if (client && isConnected) {
    const channel = req.query.channel || CONFIG.channels[0];
    client.whois(channel, (data) => {
      res.json({ users: data || [] });
    });
  } else {
    res.status(503).json({ error: 'Bot not connected', users: [] });
  }
});

// Serve index.html for root
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'index.html'));
});

// WebSocket connection handler
wss.on('connection', (ws) => {
  console.log('WebSocket client connected');
  wsClients.add(ws);
  
  // Send current state
  ws.send(JSON.stringify({
    type: 'init',
    connected: isConnected,
    radioStatus,
    nick: CONFIG.nick,
  }));
  
  ws.on('close', () => {
    console.log('WebSocket client disconnected');
    wsClients.delete(ws);
  });
  
  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
    wsClients.delete(ws);
  });
});

// Graceful shutdown
function shutdown() {
  console.log('\nShutting down gracefully...');
  if (client && isConnected) {
    CONFIG.channels.forEach(channel => {
      try { client.say(channel, '🦇 BatCave Bot signing off...'); } catch(e) {}
    });
    setTimeout(() => {
      try { client.end(); } catch(e) {}
      server.close(() => {
        console.log('Server closed');
        process.exit(0);
      });
    }, 1000);
  } else {
    server.close(() => {
      console.log('Server closed');
      process.exit(0);
    });
  }
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

// Start server
console.log(`[${new Date().toISOString()}] Starting BatCave Bot Server...`);
console.log(`IRC Server: ${CONFIG.server}:${CONFIG.port}`);
console.log(`IRC Nickname: ${CONFIG.nick}`);
console.log(`IRC Channels: ${CONFIG.channels.join(', ')}`);
console.log(`HTTP Port: ${CONFIG.httpPort}`);
console.log('---');

try {
  createIRCClient();
  server.listen(CONFIG.httpPort, () => {
    console.log(`Server running at http://localhost:${CONFIG.httpPort}`);
  });
} catch (error) {
  console.error('Failed to start:', error);
  process.exit(1);
}
