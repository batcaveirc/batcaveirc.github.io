/**
 * BatCave "Vampire" Bot - GitHub Actions Edition
 * Lightweight, stateless, IRC-only implementation.
 * NO Discord bridge, NO hardcoded secrets.
 */

const irc = require('irc-framework');

// Configuration from Environment Variables (GitHub Secrets)
const config = {
    host: process.env.IRC_SERVER || 'irc.hybridirc.com',
    port: parseInt(process.env.IRC_PORT || '6667'),
    nick: process.env.IRC_NICK,
    user: process.env.IRC_NICK,
    realname: process.env.IRC_REALNAME || 'BatCave Vampire Bot',
    password: process.env.NICKSERV_PASS,
    channel: process.env.IRC_CHANNEL || '#batcave',
    owners: (process.env.OWNERS || '').split(',').map(s => s.toLowerCase().trim()),
    admins: (process.env.ADMINS || '').split(',').map(s => s.toLowerCase().trim())
};

if (!config.nick || !config.password) {
    console.error('MISSING SECRETS: IRC_NICK and NICKSERV_PASS are required.');
    process.exit(1);
}

const client = new irc.Client({
    host: config.host,
    port: config.port,
    nick: config.nick,
    username: config.user,
    realname: config.realname,
    gecos: config.realname,
    webirc: { password: process.env.WEBIRC_PASS },
    sasl: { username: config.nick, password: config.password },
    auto_reconnect: true,
    auto_reconnect_wait: 3000,
    max_reconnect_attempts: 5,
    debug: false
});

let joinedTimestamp = 0;
let warnCounts = {};

client.on('raw', message => {
    if (message.command === '001') {
        console.log('Connected to IRC.');
        if (config.password) {
            client.raw(`PRIVMSG NickServ :IDENTIFY ${config.password}`);
        }
        setTimeout(() => {
            client.raw(`JOIN ${config.channel}`);
            joinedTimestamp = Date.now();
            console.log(`Joined ${config.channel}`);
        }, 1000);
    }

    if (message.command === 'ERR_NICKNAMEINUSE' || message.command === '433') {
        const newNick = config.nick + '_';
        console.log(`Nick ${config.nick} taken, trying ${newNick}`);
        client.changeNick(newNick);
    }
});

client.on('message', event => {
    if (event.target !== config.channel) return;
    if (Date.now() - joinedTimestamp < 5000) return;

    const { nick, message } = event;
    const lowerNick = nick.toLowerCase();
    const isOwner = config.owners.includes(lowerNick);
    const isAdmin = isOwner || config.admins.includes(lowerNick);

    if (message.includes(config.nick)) {
        handleMention(event, nick, message, isAdmin, isOwner);
        return;
    }

    if (message.startsWith('!')) {
        handleCommand(event, nick, message, isAdmin, isOwner);
        return;
    }
});

client.on('join', event => {
    if (event.nick !== config.nick && event.target === config.channel) {
        const welcomePhrases = [
            `Welcome to the cave, ${event.nick}! 🦇`,
            `${event.nick} has entered the night. 🌙`,
            `Beware the shadows, ${event.nick}.`
        ];
        const msg = welcomePhrases[Math.floor(Math.random() * welcomePhrases.length)];
        client.say(config.channel, msg);
    }
});

function handleMention(event, nick, message, isAdmin, isOwner) {
    if (isAdmin) {
        const lowerMsg = message.toLowerCase();
        if (lowerMsg.includes('kick') && lowerMsg.includes('all')) {
            client.say(config.channel, `[ADMIN] Mass kick initiated by ${nick}... (Simulation)`);
            return;
        }
        if (lowerMsg.includes('mute')) {
            client.raw(`MODE ${config.channel} +m`);
            client.say(config.channel, `[ADMIN] Room muted by ${nick}.`);
            return;
        }
        if (lowerMsg.includes('unmute')) {
            client.raw(`MODE ${config.channel} -m`);
            client.say(config.channel, `[ADMIN] Room unmuted by ${nick}.`);
            return;
        }
    }

    const response = generatePersonalityResponse(message, nick, isAdmin);
    client.say(config.channel, `${nick}: ${response}`);
}

function handleCommand(event, nick, message, isAdmin, isOwner) {
    const args = message.slice(1).split(' ');
    const cmd = args.shift().toLowerCase();

    if (cmd === 'say' && isAdmin) {
        const text = args.join(' ').replace(/^\S+\s/, '');
        client.say(config.channel, text);
        return;
    }
    if (cmd === 'kick' && isAdmin) {
        const target = args[0];
        const reason = args.slice(1).join(' ') || 'Banished by order of the court.';
        if (target) client.raw(`KICK ${config.channel} ${target} :${reason}`);
        return;
    }
    if (cmd === 'ban' && isAdmin) {
        const target = args[0];
        if (target) {
            client.raw(`MODE ${config.channel} +b ${target}`);
            client.raw(`KICK ${config.channel} ${target} :Banned.`);
        }
        return;
    }
    if (cmd === 'mode' && isAdmin) {
        const modes = args.join(' ');
        if (modes) client.raw(`MODE ${config.channel} ${modes}`);
        return;
    }

    if (cmd === 'ping') {
        client.say(config.channel, `Pong! 🏓 Uptime: ${Math.floor((Date.now() - joinedTimestamp)/1000)}s`);
        return;
    }
    if (cmd === 'help') {
        client.say(config.channel, `${nick}: Commands: !ping, !hug, !slap, !bite, !trivia, !8ball, !weather. Admins: !say, !kick, !ban.`);
        return;
    }
    
    if (['hug', 'slap', 'bite', 'kiss', 'pat', 'boop'].includes(cmd)) {
        const target = args[0] || 'everyone';
        const actions = {
            hug: '🧛‍♂️ hugs', slap: '🦇 slaps', bite: '🧛‍♀️ bites', 
            kiss: '💋 kisses', pat: '👋 pats', boop: '👆 boops'
        };
        client.say(config.channel, `**${nick} ${actions[cmd]} ${target}!**`);
        return;
    }

    if (cmd === '8ball') {
        const answers = ['Yes.', 'No.', 'Maybe.', 'Ask again later.', 'Absolutely not.', 'The stars say yes.'];
        client.say(config.channel, `🎱 ${answers[Math.floor(Math.random() * answers.length)]}`);
        return;
    }
    
    if (cmd === 'trivia') {
        client.say(config.channel, `🧠 TRIVIA: What flies at night and drinks tomato juice? (Answer: !answer <text>)`);
        return;
    }
}

function generatePersonalityResponse(input, userNick, isAdmin) {
    const responses = {
        greeting: [
            "Greetings, mortal.",
            "The night is young, just like you.",
            "What brings you to my cave?",
            "I was just dreaming of blood... er, tomato juice."
        ],
        thanks: [
            "You are welcome, little bat.",
            "Don't mention it. Literally.",
            "A pleasure serving the coven."
        ],
        default: [
            "Interesting...",
            "Tell me more.",
            "*flaps wings*",
            "I'm listening.",
            "The shadows agree with you."
        ]
    };
    
    const lowerInput = input.toLowerCase();
    
    if (lowerInput.includes('hello') || lowerInput.includes('hi') || lowerInput.includes('hey')) {
        return responses.greeting[Math.floor(Math.random() * responses.greeting.length)];
    }
    if (lowerInput.includes('thank')) {
        return responses.thanks[Math.floor(Math.random() * responses.thanks.length)];
    }
    if (lowerInput.includes('who are you')) {
        return "I am the Guardian of the BatCave, a creature of the night, bound to this channel by code and curiosity.";
    }
    if (lowerInput.includes('love')) {
        return "Love is a powerful magic... even for vampires.";
    }
    if (isAdmin && lowerInput.includes('status')) {
        return "Systems nominal. Ready to serve the coven.";
    }

    return responses.default[Math.floor(Math.random() * responses.default.length)];
}

process.on('SIGTERM', () => {
    console.log('SIGTERM received. Disconnecting gracefully...');
    client.say(config.channel, '⚰️ My time is up. Back in 5 minutes...');
    client.quit('GitHub Action timeout reached.');
    setTimeout(() => process.exit(0), 2000);
});

process.on('SIGINT', () => {
    client.quit('Interrupted.');
    process.exit(0);
});

console.log(`Starting BatCave Bot as ${config.nick}...`);
client.connect();
