#!/usr/bin/env node
/**
 * BatCave Bot - IRC Bot for HybridIRC #batcave channel
 * 
 * Features:
 * - Welcomes new users
 * - Responds to !commands
 * - Shares radio status
 * - Moderation helpers
 * 
 * Setup:
 * 1. npm install irc
 * 2. Set environment variables or edit config below
 * 3. node batcave-bot.js
 */

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
};

// Bot state
let radioStatus = 'New Bollywood mix playing';
let welcomeMessages = [
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

// Create IRC client
const client = new irc.Client(
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
  console.log(`[${new Date().toISOString()}] Connected to ${CONFIG.server}`);
  console.log(`Joined channels: ${CONFIG.channels.join(', ')}`);
  
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
});

client.on('part', (channel, nick, reason) => {
  console.log(`[${new Date().toISOString()}] ${nick} left ${channel}: ${reason || ''}`);
});

client.on('quit', (nick, reason, channels) => {
  console.log(`[${new Date().toISOString()}] ${nick} quit: ${reason || ''}`);
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
      }
    }
  }
  
  // Respond to mentions
  if (text.includes(CONFIG.nick) && !text.startsWith('!')) {
    const greetings = ['hello', 'hi', 'hey', 'sup', 'yo'];
    const hasGreeting = greetings.some(g => text.toLowerCase().includes(g));
    
    if (hasGreeting) {
      client.say(channel, `Hey @${from}! 🦇`);
    }
  }
  
  // Admin commands (if adminNick is set)
  if (from === CONFIG.adminNick && text.startsWith('!admin ')) {
    const adminCmd = text.slice(7).split(' ');
    
    if (adminCmd[0] === 'radio' && adminCmd[1]) {
      radioStatus = adminCmd.slice(1).join(' ');
      client.say(channel, `📻 Radio status updated: ${radioStatus}`);
    }
    
    if (adminCmd[0] === 'say' && adminCmd[1]) {
      client.say(channel, adminCmd.slice(1).join(' '));
    }
    
    if (adminCmd[0] === 'kick' && adminCmd[1]) {
      client.say(channel, `Kicking ${adminCmd[1]}...`);
      client.raw(`KICK ${channel} ${adminCmd[1]} :${adminCmd.slice(2).join(' ') || 'Violating coven rules'}`);
    }
  }
});

client.on('error', (error) => {
  console.error(`[${new Date().toISOString()}] Error:`, error);
});

client.on('netError', (error) => {
  console.error(`[${new Date().toISOString()}] Network Error:`, error.message);
  console.log('Attempting to reconnect in 10 seconds...');
  setTimeout(() => {
    try {
      client.connect();
    } catch (e) {
      console.error('Reconnection failed:', e);
    }
  }, 10000);
});

// Connect
console.log(`[${new Date().toISOString()}] Starting BatCave Bot...`);
console.log(`Server: ${CONFIG.server}:${CONFIG.port}`);
console.log(`Nickname: ${CONFIG.nick}`);
console.log(`Channels: ${CONFIG.channels.join(', ')}`);
console.log('---');

try {
  client.connect();
} catch (error) {
  console.error('Failed to connect:', error);
  process.exit(1);
}

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\nShutting down gracefully...');
  CONFIG.channels.forEach(channel => {
    client.say(channel, '🦇 BatCave Bot signing off...');
  });
  setTimeout(() => {
    client.quit('Shutdown');
    process.exit(0);
  }, 1000);
});

process.on('SIGTERM', () => {
  console.log('\nShutting down...');
  client.quit('Terminated');
  process.exit(0);
});
