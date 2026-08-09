/**
 * BatCave "Vampire" Bot - Lightweight GitHub Actions Edition
 * 
 * A stateless IRC bot designed to run on GitHub Actions with 6-hour job limits.
 * Implements core Vampire personality, moderation, and user commands.
 * 
 * ALL CREDENTIALS VIA ENVIRONMENT VARIABLES ONLY - NEVER HARDCODED
 */

const irc = require('irc-framework');
const crypto = require('crypto');

// Configuration from environment variables
const config = {
    server: process.env.IRC_SERVER || 'irc.hybridirc.com',
    port: parseInt(process.env.IRC_PORT) || 6667,
    nick: process.env.IRC_NICK || 'BatCaveBot',
    realname: process.env.IRC_REALNAME || 'BatCave Vampire Bot',
    channel: process.env.IRC_CHANNEL || '#batcave',
    nickservPass: process.env.NICKSERV_PASS || '',
    nickservAccount: process.env.NICKSERV_ACCOUNT || '',
    ghostOnConnect: process.env.NICKSERV_GHOST_ON_CONNECT === 'true',
    owners: (process.env.OWNERS || '').split(',').map(n => n.toLowerCase().trim()).filter(Boolean),
    admins: (process.env.ADMINS || '').split(',').map(n => n.toLowerCase().trim()).filter(Boolean)
};

// State (in-memory only, resets on restart)
const state = {
    warnings: new Map(), // nick -> count
    lastPersonaRolls: new Map(), // channel -> [traits]
    joinTimestamp: Date.now(),
    messageQueue: [],
    isProcessingQueue: false
};

// Persona trait pools
const personaTraits = {
    humor: ['dark_comedy', 'dry_wit', 'witty_banter', 'sarcasm', 'philosophical', 'cryptic', 'absurdist', 'playful_teasing', 'gothic_humor'],
    formality: ['casual', 'sophisticated', 'mysterious', 'poetic', 'ethereal', 'cryptic'],
    energy: ['high', 'chill', 'mysterious', 'laid_back', 'intense', 'dreamy', 'contemplative'],
    attitude: ['flirty', 'moody', 'protective', 'mischievous', 'alluring', 'brooding', 'whimsical', 'theatrical'],
    quirk: ['gothic_imagery', 'mystical_metaphors', 'literary_quotes', 'philosophical_tangents']
};

// Initialize IRC client
const client = new irc.Client({
    host: config.server,
    port: config.port,
    nick: config.nick,
    username: config.nick.toLowerCase(),
    realname: config.realname,
    gecos: config.realname,
    reconnect: true,
    reconnect_max_delay: 30000,
    sasl: {
        account: config.nickservAccount || config.nick,
        password: config.nickservPass
    }
});

// Helper: Check if user is admin/owner
function isAdmin(nick) {
    const lowerNick = nick.toLowerCase();
    return config.owners.includes(lowerNick) || config.admins.includes(lowerNick);
}

function isOwner(nick) {
    return config.owners.includes(nick.toLowerCase());
}

// Helper: Get random persona traits
function getPersonaTraits(channel) {
    const traits = {
        humor: personaTraits.humor[Math.floor(Math.random() * personaTraits.humor.length)],
        formality: personaTraits.formality[Math.floor(Math.random() * personaTraits.formality.length)],
        energy: personaTraits.energy[Math.floor(Math.random() * personaTraits.energy.length)],
        attitude: personaTraits.attitude[Math.floor(Math.random() * personaTraits.attitude.length)],
        quirk: personaTraits.quirk[Math.floor(Math.random() * personaTraits.quirk.length)]
    };
    
    // Store for no-repeat logic (in-memory only)
    if (!state.lastPersonaRolls.has(channel)) {
        state.lastPersonaRolls.set(channel, []);
    }
    const history = state.lastPersonaRolls.get(channel);
    history.push(traits);
    if (history.length > 5) history.shift();
    
    return traits;
}

// Helper: Generate vampire-style response
function generateVampireResponse(message, context = {}) {
    const traits = getPersonaTraits(context.channel || '#batcave');
    
    const responses = {
        greeting: [
            `*emerges from the shadows* Greetings, ${context.nick || 'mortal'}...`,
            `*flies in silently* Ah, another soul joins us in the darkness...`,
            `*materializes from mist* Welcome to the BatCave...`,
            `*perches atop a gargoyle* Well well, what have we here?`
        ],
        mention: [
            `*turns slowly* You summoned me, ${context.nick || 'little bat'}?`,
            `*eyes glow red* I heard my name... speak your business.`,
            `*descends from ceiling* What troubles you in this dark hour?`,
            `*folds wings* Yes? Make it quick, the night is young...`
        ],
        default: [
            `*nods mysteriously* Indeed...`,
            `*smirks in the darkness* Interesting...`,
            `*strokes chin thoughtfully* The shadows whisper many things...`,
            `*gazes into the void* As you say...`
        ]
    };
    
    const pool = context.type ? (responses[context.type] || responses.default) : responses.default;
    return pool[Math.floor(Math.random() * pool.length)];
}

// Helper: Rate-limited message sending
async function sendMessage(target, message) {
    state.messageQueue.push({ target, message });
    if (!state.isProcessingQueue) {
        processMessageQueue();
    }
}

async function processMessageQueue() {
    state.isProcessingQueue = true;
    while (state.messageQueue.length > 0) {
        const { target, message } = state.messageQueue.shift();
        client.say(target, message);
        await new Promise(resolve => setTimeout(resolve, 250)); // 250ms between messages
    }
    state.isProcessingQueue = false;
}

// Command handlers
const commands = {
    // Basic utilities
    ping: async (context) => {
        const latency = Date.now() - context.timestamp;
        await sendMessage(context.channel, `🦇 Pong! Latency: ${latency}ms | Uptime: ${Math.floor((Date.now() - startTime) / 1000)}s`);
    },
    
    help: async (context) => {
        const helpText = [
            `🦇 **BatCave Bot Commands** 🦇`,
            `Fun: !hug !slap !bite !kiss !pat !boop !bonk !dance !flirt !roast`,
            `Games: !trivia !hangman !blackjack !roulette !8ball !rps !dice`,
            `Utils: !weather !define !translate !calc !time !password !color`,
            `Info: !status !commands !rules !personality`,
            `Admin: !say !kick !ban !warn !mute (admin only)`
        ];
        for (const line of helpText) {
            await sendMessage(context.channel, line);
            await new Promise(r => setTimeout(r, 500));
        }
    },
    
    rules: async (context) => {
        await sendMessage(context.channel, `📜 **BatCave Rules**: Be respectful | No spam | No hate speech | Listen to admins | Have fun in the darkness! 🦇`);
    },
    
    status: async (context) => {
        await sendMessage(context.channel, `🦇 BatCave Bot Online | Mode: Vampire | Channel: ${context.channel} | Uptime: ${Math.floor((Date.now() - startTime) / 1000)}s`);
    },
    
    personality: async (context) => {
        const traits = getPersonaTraits(context.channel);
        await sendMessage(context.channel, `🦇 Current Persona: ${traits.humor.replace(/_/g, ' ')} | ${traits.attitude.replace(/_/g, ' ')} | ${traits.quirk.replace(/_/g, ' ')}`);
    },
    
    // Fun commands
    hug: async (context, args) => {
        const target = args[0] || 'everyone';
        await sendMessage(context.channel, `🦇 ${context.nick} hugs ${target} warmly! *wings envelop them in darkness*`);
    },
    
    slap: async (context, args) => {
        const target = args[0] || 'the air';
        await sendMessage(context.channel, `🦇 ${context.nick} slaps ${target} with a velvet glove!`);
    },
    
    bite: async (context, args) => {
        const target = args[0] || 'randomly';
        await sendMessage(context.channel, `🦇 ${context.nick} bites ${target}! *sharp fangs gleam*`);
    },
    
    kiss: async (context, args) => {
        const target = args[0] || 'the darkness';
        await sendMessage(context.channel, `🦇 ${context.nick} kisses ${target} passionately...`);
    },
    
    pat: async (context, args) => {
        const target = args[0] || 'a nearby bat';
        await sendMessage(context.channel, `🦇 ${context.nick} pats ${target} gently on the head.`);
    },
    
    boop: async (context, args) => {
        const target = args[0] || 'your nose';
        await sendMessage(context.channel, `🦇 ${context.nick} boops ${target}! *boop*`);
    },
    
    bonk: async (context, args) => {
        const target = args[0] || 'someone naughty';
        await sendMessage(context.channel, `🦇 ${context.nick} bonks ${target} with a gothic candlestick! *thwack*`);
    },
    
    dance: async (context) => {
        const moves = ['*does the vampire waltz*', '*moonwalks through shadows*', '*spins dramatically*', '*breakdances on a coffin*'];
        await sendMessage(context.channel, `🦇 ${context.nick} ${moves[Math.floor(Math.random() * moves.length)]}!`);
    },
    
    flirt: async (context, args) => {
        const target = args[0] || 'the room';
        const lines = [
            `Are you a bat? Because you've stolen my heart...`,
            `Is your name Wednesday? Because you're addams-ingly beautiful...`,
            `Do you believe in love at first sight, or should I fly by again?`,
            `Are you made of copper and tellurium? Because you're CuTe...`
        ];
        await sendMessage(context.channel, `🦇 ${context.nick} flirts with ${target}: "${lines[Math.floor(Math.random() * lines.length)]}"`);
    },
    
    roast: async (context, args) => {
        const target = args[0] || 'everyone';
        const roasts = [
            `You're so boring, even the bats fell asleep!`,
            `Your fashion sense is so outdated, it's from before I was turned!`,
            `You're slower than a zombie in molasses!`,
            `Your jokes are older than my vampire lineage!`
        ];
        await sendMessage(context.channel, `🦇 ${context.nick} roasts ${target}: "${roasts[Math.floor(Math.random() * roasts.length)]}"`);
    },
    
    // Games
    '8ball': async (context, args) => {
        const answers = [
            'The shadows say yes...', 'Definitely not...', 'Ask again in moonlight...', 
            'My crystal ball is cloudy...', 'Without a doubt...', 'Never in a million years...',
            'The spirits are uncertain...', 'Absolutely!', 'Don\'t count on it...'
        ];
        const question = args.join(' ') || 'a question';
        await sendMessage(context.channel, `🔮 ${context.nick} consults the dark oracle about "${question}": ${answers[Math.floor(Math.random() * answers.length)]}`);
    },
    
    roll: async (context, args) => {
        const sides = parseInt(args[0]) || 20;
        const result = Math.floor(Math.random() * sides) + 1;
        await sendMessage(context.channel, `🎲 ${context.nick} rolls a d${sides}: **${result}**`);
    },
    
    flip: async (context) => {
        const result = Math.random() < 0.5 ? 'Heads' : 'Tails';
        await sendMessage(context.channel, `🪙 ${context.nick} flips a coin: **${result}**`);
    },
    
    rps: async (context, args) => {
        const choices = ['rock', 'paper', 'scissors'];
        const botChoice = choices[Math.floor(Math.random() * 3)];
        const userChoice = args[0]?.toLowerCase();
        
        if (!userChoice || !choices.includes(userChoice)) {
            await sendMessage(context.channel, `Usage: !rps <rock|paper|scissors>`);
            return;
        }
        
        let result = 'tie';
        if ((userChoice === 'rock' && botChoice === 'scissors') ||
            (userChoice === 'paper' && botChoice === 'rock') ||
            (userChoice === 'scissors' && botChoice === 'paper')) {
            result = 'win';
        } else if (userChoice !== botChoice) {
            result = 'lose';
        }
        
        const emojis = { rock: '🪨', paper: '📄', scissors: '✂️' };
        await sendMessage(context.channel, `🎮 ${context.nick} plays ${emojis[userChoice]} vs ${emojis[botChoice]} - You ${result}!`);
    },
    
    // Admin commands
    say: async (context, args) => {
        if (!isAdmin(context.nick)) {
            await sendMessage(context.channel, `❌ Access denied. Admins only.`);
            return;
        }
        const message = args.join(' ');
        if (message) {
            await sendMessage(context.channel, message);
        }
    },
    
    kick: async (context, args) => {
        if (!isAdmin(context.nick)) {
            await sendMessage(context.channel, `❌ Access denied. Admins only.`);
            return;
        }
        const target = args[0];
        const reason = args.slice(1).join(' ') || 'No reason given';
        if (target) {
            client.raw(`KICK ${context.channel} ${target} :${reason}`);
            await sendMessage(context.channel, `🦇 ${context.nick} kicked ${target}: ${reason}`);
        }
    },
    
    warn: async (context, args) => {
        if (!isAdmin(context.nick)) {
            await sendMessage(context.channel, `❌ Access denied. Admins only.`);
            return;
        }
        const target = args[0]?.toLowerCase();
        if (!target) {
            await sendMessage(context.channel, `Usage: !warn <nick>`);
            return;
        }
        
        const count = (state.warnings.get(target) || 0) + 1;
        state.warnings.set(target, count);
        
        await sendMessage(context.channel, `⚠️ ${context.nick} warns ${target} (${count}/3)`);
        
        if (count >= 3) {
            client.raw(`KICK ${context.channel} ${target} :Auto-kick (3 warnings)`);
            state.warnings.set(target, 0);
            await sendMessage(context.channel, `🦇 ${target} was auto-kicked for repeated warnings.`);
        }
    },
    
    warnings: async (context, args) => {
        if (!isAdmin(context.nick)) {
            await sendMessage(context.channel, `❌ Access denied. Admins only.`);
            return;
        }
        const target = args[0]?.toLowerCase();
        if (!target) {
            await sendMessage(context.channel, `Usage: !warnings <nick>`);
            return;
        }
        const count = state.warnings.get(target) || 0;
        await sendMessage(context.channel, `⚠️ ${target} has ${count}/3 warnings.`);
    }
};

// Emote command generator
const emotes = ['hug', 'slap', 'bite', 'kiss', 'cuddle', 'pat', 'headpat', 'boop', 'bonk', 'poke', 'tickle', 'glomp', 'snuggle', 'highfive', 'fistbump', 'handshake', 'wave', 'salute', 'flirt', 'tease', 'compliment', 'roast', 'admire', 'cheer', 'comfort', 'blowkiss', 'serenade', 'dance', 'wink', 'nudge', 'bow', 'curtsy'];

emotes.forEach(emote => {
    if (!commands[emote]) {
        commands[emote] = async (context, args) => {
            const target = args[0] || 'the darkness';
            const actions = {
                hug: `embraces ${target} in shadowy wings`,
                slap: `slaps ${target} with a velvet glove`,
                bite: `bites ${target} gently`,
                kiss: `kisses ${target} passionately`,
                cuddle: `cuddles up to ${target}`,
                pat: `pats ${target} on the head`,
                headpat: `gently headpats ${target}`,
                boop: `boops ${target}'s nose`,
                bonk: `bonks ${target} with a candlestick`,
                poke: `pokes ${target}`,
                tickle: `tickles ${target}`,
                glomp: `glomps ${target}`,
                snuggle: `snuggles with ${target}`,
                highfive: `high-fives ${target}`,
                fistbump: `fist-bumps ${target}`,
                handshake: `shakes hands with ${target}`,
                wave: `waves at ${target}`,
                salute: `salutes ${target}`,
                flirt: `flirts with ${target}`,
                tease: `teases ${target}`,
                compliment: `compliments ${target}`,
                roast: `roasts ${target}`,
                admire: `admires ${target}`,
                cheer: `cheers for ${target}`,
                comfort: `comforts ${target}`,
                blowkiss: `blows a kiss to ${target}`,
                serenade: `serenades ${target}`,
                dance: `dances with ${target}`,
                wink: `winks at ${target}`,
                nudge: `nudges ${target}`,
                bow: `bows to ${target}`,
                curtsy: `curtsies before ${target}`
            };
            await sendMessage(context.channel, `🦇 ${context.nick} ${actions[emote] || 'interacts with'} ${target}.`);
        };
    }
});

// Event handlers
client.on('raw', event => {
    const { command, params } = event;
    
    // Handle registration complete
    if (command === '001') {
        console.log(`✅ Connected to ${config.server} as ${config.nick}`);
        
        // NickServ identification
        if (config.nickservPass) {
            if (config.ghostOnConnect) {
                client.raw(`PRIVMSG NickServ :GHOST ${config.nick} ${config.nickservPass}`);
                setTimeout(() => {
                    client.raw(`PRIVMSG NickServ :RECOVER ${config.nick} ${config.nickservPass}`);
                }, 1000);
            }
            
            const account = config.nickservAccount || config.nick;
            client.raw(`PRIVMSG NickServ :IDENTIFY ${account} ${config.nickservPass}`);
            console.log(`🔐 Identifying as ${account}...`);
        }
        
        // Join channel after brief delay
        setTimeout(() => {
            const channels = config.channel.split(',');
            channels.forEach(ch => {
                client.join(ch.trim());
                console.log(`🦇 Joining ${ch.trim()}...`);
            });
        }, 2000);
    }
    
    // Handle nick in use
    if (command === '433' || command === '437') {
        const newNick = config.nick + '_';
        client.nick(newNick);
        console.log(`⚠️ Nick ${config.nick} taken, trying ${newNick}`);
    }
});

client.on('join', event => {
    const { channel, nick } = event;
    
    // Ignore if it's not us joining
    if (nick.toLowerCase() !== config.nick.toLowerCase()) {
        // Auto-welcome new users (only if they joined after our timestamp)
        if (Date.now() > state.joinTimestamp) {
            const welcomeMessages = [
                `*emerges from shadows* Welcome to ${channel}, ${nick}! Beware the night... 🦇`,
                `*flies overhead* Greetings ${nick}! Make yourself at home in the BatCave...`,
                `*perches on gargoyle* Another soul joins us... Welcome ${nick}!`
            ];
            setTimeout(() => {
                sendMessage(channel, welcomeMessages[Math.floor(Math.random() * welcomeMessages.length)]);
            }, 1000);
        }
    } else {
        // We joined, update timestamp to ignore replayed messages
        state.joinTimestamp = Date.now();
        console.log(`✅ Joined ${channel}`);
    }
});

client.on('privmsg', event => {
    const { target, nick, message } = event;
    const channel = target.startsWith('#') ? target : nick; // PM or channel
    
    // Ignore messages before we joined (replay protection)
    if (Date.now() < state.joinTimestamp) {
        return;
    }
    
    // Ignore service bots and self
    const serviceNicks = ['nickserv', 'chanserv', 'botserv', 'hostserv', 'memoserv', 'operserv'];
    if (serviceNicks.includes(nick.toLowerCase()) || nick.toLowerCase() === config.nick.toLowerCase()) {
        return;
    }
    
    console.log(`<${nick}> ${message}`);
    
    // Check for bad words (simple implementation)
    const badWords = ['spam', 'hate', 'kill']; // Expand as needed
    const hasBadWord = badWords.some(word => message.toLowerCase().includes(word));
    if (hasBadWord && !isAdmin(nick)) {
        // Warn user
        const count = (state.warnings.get(nick.toLowerCase()) || 0) + 1;
        state.warnings.set(nick.toLowerCase(), count);
        sendMessage(channel, `⚠️ Warning to ${nick}: Please keep it civil. (${count}/3)`);
        if (count >= 3) {
            client.raw(`KICK ${channel} ${nick} :Auto-kick (bad language)`);
            state.warnings.set(nick.toLowerCase(), 0);
        }
        return;
    }
    
    // Check for command prefix
    if (message.startsWith('!')) {
        const parts = message.slice(1).split(' ');
        const cmd = parts[0].toLowerCase();
        const args = parts.slice(1);
        
        const context = {
            nick,
            channel,
            message,
            timestamp: Date.now()
        };
        
        if (commands[cmd]) {
            console.log(`📝 Executing command: ${cmd}`);
            commands[cmd](context, args).catch(err => {
                console.error(`Error executing ${cmd}:`, err);
            });
        }
        return;
    }
    
    // Check for mention (bot nick in message)
    const nickPattern = new RegExp(`\\b${config.nick}\\b`, 'i');
    if (nickPattern.test(message)) {
        // Natural language admin control (simplified)
        const lowerMsg = message.toLowerCase();
        if (isAdmin(nick)) {
            if (lowerMsg.includes('op') && lowerMsg.includes('give')) {
                // Extract nick to op
                const match = message.match(/op\s+(\w+)/i);
                if (match) {
                    client.raw(`MODE ${channel} +o ${match[1]}`);
                    sendMessage(channel, `✅ Giving ${match[1]} operator status...`);
                    return;
                }
            }
            if (lowerMsg.includes('kick') && lowerMsg.includes('all')) {
                sendMessage(channel, `⚠️ Mass kick command detected (simplified - would need full implementation)`);
                return;
            }
            if (lowerMsg.includes('mute') || lowerMsg.includes('+m')) {
                client.raw(`MODE ${channel} +m`);
                sendMessage(channel, `🔇 Room muted (+m)`);
                return;
            }
            if (lowerMsg.includes('unmute') || lowerMsg.includes('-m')) {
                client.raw(`MODE ${channel} -m`);
                sendMessage(channel, `🔊 Room unmuted (-m)`);
                return;
            }
        }
        
        // Default AI response (placeholder - would integrate with LLM API)
        const response = generateVampireResponse(message, { type: 'mention', nick, channel });
        sendMessage(channel, response);
    }
});

client.on('part', event => {
    const { channel, nick, reason } = event;
    if (nick.toLowerCase() !== config.nick.toLowerCase()) {
        console.log(`👋 ${nick} left ${channel}${reason ? `: ${reason}` : ''}`);
    }
});

client.on('quit', event => {
    const { nick, reason } = event;
    console.log(`🚪 ${nick} quit${reason ? `: ${reason}` : ''}`);
});

client.on('error', event => {
    console.error('IRC Error:', event);
});

client.on('disconnect', event => {
    console.log('⚠️ Disconnected from IRC server');
});

client.on('reconnect', event => {
    console.log('🔄 Reconnecting to IRC server...');
    state.joinTimestamp = Date.now();
});

// Start the bot
const startTime = Date.now();
console.log('🦇 BatCave Vampire Bot starting...');
console.log(`Server: ${config.server}:${config.port}`);
console.log(`Nick: ${config.nick}`);
console.log(`Channel: ${config.channel}`);
console.log(`Owners: ${config.owners.length || 0}, Admins: ${config.admins.length || 0}`);

client.connect();

// Graceful shutdown for SIGTERM (GitHub Actions job ending)
process.on('SIGTERM', () => {
    console.log('\n🦇 Received SIGTERM, shutting down gracefully...');
    client.quit('GitHub Actions job ending - be back soon!');
    setTimeout(() => {
        process.exit(0);
    }, 2000);
});

process.on('SIGINT', () => {
    console.log('\n🦇 Received SIGINT, shutting down...');
    client.quit('Bot stopping');
    setTimeout(() => {
        process.exit(0);
    }, 2000);
});
