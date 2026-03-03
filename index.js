require('dotenv').config();
const { Client, GatewayIntentBits, EmbedBuilder, REST, Routes, SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const sqlite3 = require('sqlite3').verbose();
const { open } = require('sqlite');

async function initializeDatabase() {
    const db = await open({ filename: './ctf.db', driver: sqlite3.Database });
    await db.exec(`
        CREATE TABLE IF NOT EXISTS challenges (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT UNIQUE,
            description TEXT,
            points INTEGER,
            flag TEXT,
            difficulty TEXT,
            category TEXT,
            flag_format TEXT,
            link TEXT,
            author_id TEXT,
            author_name TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
        CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            username TEXT,
            points INTEGER DEFAULT 0,
            last_submission DATETIME
        );
        CREATE TABLE IF NOT EXISTS submissions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id TEXT,
            challenge_id INTEGER,
            points_earned INTEGER,
            position INTEGER,
            submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(user_id) REFERENCES users(id),
            FOREIGN KEY(challenge_id) REFERENCES challenges(id)
        );
    `);
    return db;
}

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
    ]
});

const ANNOUNCEMENT_CHANNEL_ID = process.env.ANNOUNCEMENT_CHANNEL || null;
const SUBMISSION_CHANNEL_ID = process.env.SUBMISSION_CHANNEL || ANNOUNCEMENT_CHANNEL_ID;

function getDifficultyColor(difficulty) {
    return { 'Easy': '#00FF00', 'Normal': '#55FF55', 'Medium': '#FFFF00', 'Hard': '#FFA500', 'Insane': '#FF0000' }[difficulty] || '#0099FF';
}

function isAdmin(member) {
    return member.roles.cache.has(process.env.ADMIN_ROLE_ID);
}

// Register slash commands
async function registerCommands() {
    const commands = [
        new SlashCommandBuilder().setName('help').setDescription('Show all commands'),
        new SlashCommandBuilder().setName('ping').setDescription('Check bot latency'),
        new SlashCommandBuilder().setName('status').setDescription('View bot statistics'),
        new SlashCommandBuilder().setName('leaderboard').setDescription('Show current rankings'),
        new SlashCommandBuilder().setName('challenges').setDescription('View all active challenges'),
        new SlashCommandBuilder()
            .setName('flag')
            .setDescription('Submit a flag privately')
            .addStringOption(o => o.setName('challenge').setDescription('Challenge name').setRequired(true))
            .addStringOption(o => o.setName('flag').setDescription('Your flag').setRequired(true)),
        new SlashCommandBuilder()
            .setName('create')
            .setDescription('Create a new challenge (Admin only)')
            .addStringOption(o => o.setName('name').setDescription('Challenge name').setRequired(true))
            .addStringOption(o => o.setName('difficulty').setDescription('Easy/Normal/Medium/Hard/Insane').setRequired(true))
            .addStringOption(o => o.setName('description').setDescription('Challenge description').setRequired(true))
            .addStringOption(o => o.setName('category').setDescription('e.g. Web, Crypto, Forensics').setRequired(true))
            .addStringOption(o => o.setName('flag_format').setDescription('e.g. flag{xxx}').setRequired(true))
            .addStringOption(o => o.setName('flag').setDescription('The actual flag').setRequired(true))
            .addIntegerOption(o => o.setName('points').setDescription('Points for this challenge').setRequired(true))
            .addStringOption(o => o.setName('link').setDescription('Challenge link (optional)').setRequired(false)),
        new SlashCommandBuilder()
            .setName('editchallenge')
            .setDescription('Edit a challenge (Admin only)')
            .addStringOption(o => o.setName('name').setDescription('Challenge name').setRequired(true))
            .addStringOption(o => o.setName('field').setDescription('Field to edit: name, difficulty, description, category, flag, flag_format, link, points').setRequired(true))
            .addStringOption(o => o.setName('value').setDescription('New value').setRequired(true)),
        new SlashCommandBuilder()
            .setName('deletechallenge')
            .setDescription('Delete a challenge (Admin only)')
            .addStringOption(o => o.setName('name').setDescription('Challenge name').setRequired(true)),
        new SlashCommandBuilder()
            .setName('adminview')
            .setDescription('View all challenges with flags (Admin only)'),
    ].map(c => c.toJSON());

    const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
    try {
        await rest.put(Routes.applicationCommands(process.env.CLIENT_ID), { body: commands });
        console.log('✅ Slash commands registered!');
    } catch (err) {
        console.error('Failed to register commands:', err);
    }
}

client.once('ready', async () => {
    console.log(`Logged in as ${client.user.tag}!`);
    await initializeDatabase();
    await registerCommands();
});

client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;
    const db = await initializeDatabase();
    const { commandName } = interaction;

    // /help
    if (commandName === 'help') {
        const embed = new EmbedBuilder()
            .setTitle('🛠️ CTF Bot Help')
            .setDescription('All commands use `/` prefix. Flag submissions are private.')
            .addFields(
                { name: '/help', value: 'Show this help menu' },
                { name: '/ping', value: 'Check bot latency' },
                { name: '/status', value: 'View bot statistics' },
                { name: '/leaderboard', value: 'Show current rankings' },
                { name: '/challenges', value: 'View all active challenges' },
                { name: '/flag', value: 'Submit a flag privately' },
            )
            .setColor('#0099ff')
            .setFooter({ text: 'Made for CTF Players' });
        return interaction.reply({ embeds: [embed] });
    }

    // /ping
    if (commandName === 'ping') {
        const latency = Date.now() - interaction.createdTimestamp;
        return interaction.reply(`🏓 Pong! Latency: ${latency}ms`);
    }

    // /status
    if (commandName === 'status') {
        const challengeCount = await db.get('SELECT COUNT(*) as count FROM challenges');
        const userCount = await db.get('SELECT COUNT(*) as count FROM users');
        const embed = new EmbedBuilder()
            .setTitle('🤖 Bot Status')
            .addFields(
                { name: 'Uptime', value: `${(process.uptime() / 60 / 60).toFixed(2)} hours`, inline: true },
                { name: 'Memory', value: `${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)} MB`, inline: true },
                { name: 'Challenges', value: challengeCount.count.toString(), inline: true },
                { name: 'Participants', value: userCount.count.toString(), inline: true }
            )
            .setColor('#00FF00');
        return interaction.reply({ embeds: [embed] });
    }

    // /leaderboard
    if (commandName === 'leaderboard') {
        const topUsers = await db.all('SELECT username, points FROM users ORDER BY points DESC LIMIT 10');
        const embed = new EmbedBuilder()
            .setTitle('🏆 CTF Leaderboard')
            .setDescription(
                topUsers.map((u, i) => `${i + 1}. **${u.username}** — ${u.points} pts`).join('\n') || 'No submissions yet!'
            )
            .setColor('#FFD700');
        return interaction.reply({ embeds: [embed] });
    }

    // /challenges — public view (no flags)
    if (commandName === 'challenges') {
        const challenges = await db.all('SELECT * FROM challenges ORDER BY created_at DESC');
        if (challenges.length === 0) return interaction.reply({ content: '❌ No challenges available yet!', ephemeral: true });

        const embed = new EmbedBuilder()
            .setTitle('🚩 Active Challenges')
            .setColor('#0099ff');

        challenges.forEach(c => {
            const solveCount = db.get('SELECT COUNT(*) as count FROM submissions WHERE challenge_id = ?', [c.id]);
            embed.addFields({
                name: `${c.name} — ${c.points} pts`,
                value: `**Category:** ${c.category} | **Difficulty:** ${c.difficulty}\n**Format:** ${c.flag_format || 'N/A'}\n${c.link !== 'No Link Provided' ? `**Link:** ${c.link}` : ''}`,
                inline: false
            });
        });

        return interaction.reply({ embeds: [embed] });
    }

    // /adminview — admin only, shows flags
    if (commandName === 'adminview') {
        if (!isAdmin(interaction.member)) return interaction.reply({ content: '❌ Admin only!', ephemeral: true });

        const challenges = await db.all('SELECT * FROM challenges ORDER BY created_at DESC');
        if (challenges.length === 0) return interaction.reply({ content: '❌ No challenges yet!', ephemeral: true });

        const embed = new EmbedBuilder()
            .setTitle('🔒 Admin — All Challenges')
            .setColor('#FF0000');

        for (const c of challenges) {
            const solvers = await db.get('SELECT COUNT(*) as count FROM submissions WHERE challenge_id = ?', [c.id]);
            embed.addFields({
                name: `${c.name} (${c.category} / ${c.difficulty})`,
                value: `**Points:** ${c.points}\n**Flag:** \`${c.flag}\`\n**Solvers:** ${solvers.count}\n**Format:** ${c.flag_format || 'N/A'}`,
                inline: false
            });
        }

        return interaction.reply({ embeds: [embed], ephemeral: true }); // only visible to admin
    }

    // /flag — private submission
    if (commandName === 'flag') {
        const challengeName = interaction.options.getString('challenge');
        const userFlag = interaction.options.getString('flag');

        await interaction.deferReply({ ephemeral: true }); // only visible to user

        try {
            const challenge = await db.get('SELECT * FROM challenges WHERE name = ?', [challengeName]);
            if (!challenge) return interaction.editReply(`❌ Challenge "${challengeName}" not found!`);

            const existing = await db.get('SELECT * FROM submissions WHERE user_id = ? AND challenge_id = ?', [interaction.user.id, challenge.id]);
            if (existing) return interaction.editReply(`❌ You already solved **${challengeName}**!`);

            if (userFlag !== challenge.flag) return interaction.editReply('❌ Incorrect flag! Try again.');

            const solverCount = await db.get('SELECT COUNT(*) as count FROM submissions WHERE challenge_id = ?', [challenge.id]);
            const position = solverCount.count + 1;

            // Fixed points — no decreasing, everyone gets the same points
            const pointsAwarded = challenge.points;

            await db.run(
                `INSERT INTO users (id, username, points) VALUES (?, ?, ?)
                ON CONFLICT(id) DO UPDATE SET username = excluded.username, points = points + excluded.points`,
                [interaction.user.id, interaction.user.username, pointsAwarded]
            );

            await db.run(
                'INSERT INTO submissions (user_id, challenge_id, points_earned, position) VALUES (?, ?, ?, ?)',
                [interaction.user.id, challenge.id, pointsAwarded, position]
            );

            let positionMsg = position === 1 ? '🥇 First Blood!' : position === 2 ? '🥈 Second solver!' : position === 3 ? '🥉 Third solver!' : `🏅 Position #${position}`;

            await interaction.editReply(`✅ Correct flag for **${challengeName}**!\n${positionMsg}\n**+${pointsAwarded} points**`);

            // Announce in submission channel
            if (position <= 3 && SUBMISSION_CHANNEL_ID) {
                const channel = await client.channels.fetch(SUBMISSION_CHANNEL_ID);
                const embed = new EmbedBuilder()
                    .setTitle(`${position === 1 ? '🥇' : position === 2 ? '🥈' : '🥉'} ${interaction.user.username} solved ${challengeName}!`)
                    .setColor(position === 1 ? '#FFD700' : position === 2 ? '#C0C0C0' : '#CD7F32')
                    .addFields(
                        { name: 'Points Awarded', value: pointsAwarded.toString(), inline: true },
                        { name: 'Position', value: `#${position}`, inline: true },
                    );
                await channel.send({ embeds: [embed] });
            }

        } catch (err) {
            console.error('Flag error:', err);
            interaction.editReply('❌ Error processing submission!');
        }
        return;
    }

    // /create (admin)
    if (commandName === 'create') {
        if (!isAdmin(interaction.member)) return interaction.reply({ content: '❌ Admin only!', ephemeral: true });

        const name = interaction.options.getString('name');
        const difficulty = interaction.options.getString('difficulty');
        const description = interaction.options.getString('description');
        const category = interaction.options.getString('category');
        const flagFormat = interaction.options.getString('flag_format');
        const flag = interaction.options.getString('flag');
        const points = interaction.options.getInteger('points');
        const link = interaction.options.getString('link') || 'No Link Provided';

        await interaction.deferReply({ ephemeral: true });

        try {
            const existing = await db.get('SELECT 1 FROM challenges WHERE name = ?', [name]);
            if (existing) return interaction.editReply(`❌ Challenge "${name}" already exists!`);

            await db.run(
                'INSERT INTO challenges (name, description, points, flag, difficulty, category, flag_format, link, author_id, author_name) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
                [name, description, points, flag, difficulty, category, flagFormat, link, interaction.user.id, interaction.user.username]
            );

            const embed = new EmbedBuilder()
                .setTitle(`🚩 New Challenge: ${name}`)
                .setDescription(description)
                .addFields(
                    { name: 'Difficulty', value: difficulty, inline: true },
                    { name: 'Category', value: category, inline: true },
                    { name: 'Points', value: points.toString(), inline: true },
                    { name: 'Flag Format', value: flagFormat, inline: true },
                    { name: 'Link', value: link, inline: true },
                    { name: 'Author', value: interaction.user.username, inline: true }
                )
                .setColor(getDifficultyColor(difficulty))
                .setFooter({ text: `Submit with /flag` });

            if (ANNOUNCEMENT_CHANNEL_ID) {
                const channel = await client.channels.fetch(ANNOUNCEMENT_CHANNEL_ID);
                await channel.send({ content: '@here New challenge available!', embeds: [embed] });
            }

            await interaction.editReply(`✅ Challenge "${name}" created and announced!`);
        } catch (err) {
            console.error('Create error:', err);
            interaction.editReply('❌ Error creating challenge!');
        }
        return;
    }

    // /editchallenge (admin)
    if (commandName === 'editchallenge') {
        if (!isAdmin(interaction.member)) return interaction.reply({ content: '❌ Admin only!', ephemeral: true });

        const name = interaction.options.getString('name');
        const field = interaction.options.getString('field').toLowerCase();
        const value = interaction.options.getString('value');
        const allowed = ['name', 'difficulty', 'description', 'category', 'flag', 'flag_format', 'link', 'points'];

        if (!allowed.includes(field)) return interaction.reply({ content: `❌ Invalid field. Allowed: ${allowed.join(', ')}`, ephemeral: true });

        try {
            const finalValue = field === 'points' ? parseInt(value) : value;
            const result = await db.run(`UPDATE challenges SET ${field} = ? WHERE name = ?`, [finalValue, name]);
            if (result.changes === 0) return interaction.reply({ content: '❌ Challenge not found!', ephemeral: true });
            return interaction.reply({ content: `✅ Challenge "${name}" updated!`, ephemeral: true });
        } catch (err) {
            console.error('Edit error:', err);
            interaction.reply({ content: '❌ Error updating challenge!', ephemeral: true });
        }
        return;
    }

    // /deletechallenge (admin)
    if (commandName === 'deletechallenge') {
        if (!isAdmin(interaction.member)) return interaction.reply({ content: '❌ Admin only!', ephemeral: true });

        const name = interaction.options.getString('name');

        try {
            const challenge = await db.get('SELECT * FROM challenges WHERE name = ?', [name]);
            if (!challenge) return interaction.reply({ content: '❌ Challenge not found!', ephemeral: true });

            const subs = await db.all('SELECT user_id, points_earned FROM submissions WHERE challenge_id = ?', [challenge.id]);
            for (const s of subs) {
                await db.run('UPDATE users SET points = points - ? WHERE id = ?', [s.points_earned, s.user_id]);
            }
            await db.run('DELETE FROM submissions WHERE challenge_id = ?', [challenge.id]);
            await db.run('DELETE FROM challenges WHERE name = ?', [name]);

            return interaction.reply({ content: `✅ Challenge "${name}" deleted and points refunded!`, ephemeral: true });
        } catch (err) {
            console.error('Delete error:', err);
            interaction.reply({ content: '❌ Error deleting challenge!', ephemeral: true });
        }
        return;
    }
});

client.login(process.env.DISCORD_TOKEN).catch(err => {
    console.error('Login failed:', err);
    process.exit(1);
});
