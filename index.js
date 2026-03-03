require('dotenv').config();
const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');
const sqlite3 = require('sqlite3').verbose();
const { open } = require('sqlite');

// Initialize database
async function initializeDatabase() {
    return open({
        filename: './ctf.db',
        driver: sqlite3.Database
    });
}

const client = new Client({ 
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessageReactions
    ] 
});

// Configuration
const ANNOUNCEMENT_CHANNEL_ID = process.env.ANNOUNCEMENT_CHANNEL || null;
const SUBMISSION_CHANNEL_ID = process.env.SUBMISSION_CHANNEL || ANNOUNCEMENT_CHANNEL_ID;

// Help command embeds
const helpEmbed = new EmbedBuilder()
    .setTitle('🛠️ CTF Bot Help')
    .setDescription('All commands use comma (,) prefix\nFlag submissions are private')
    .addFields(
        { name: ',help', value: 'Show this help menu' },
        { name: ',ping', value: 'Check bot latency' },
        { name: ',status', value: 'View bot statistics' },
        { name: ',leaderboard', value: 'Show current rankings' },
        { name: ',newchallenges', value: 'Get newest challenges in DMs' },
        { name: ',flag <challenge> <flag>', value: 'Submit flag (auto-deletes)' }
    )
    .setColor('#0099ff')
    .setFooter({ text: 'Made with ❤️ for CTF Players - By DTEmpire' });

const adminHelpEmbed = new EmbedBuilder()
    .setTitle('🔒 Admin Commands Help')
    .setDescription('Administrator-only commands')
    .addFields(
        { name: ',create', value: 'Create new challenge (see format below)' },
        { name: ',editchallenge', value: 'Edit existing challenge' },
        { name: ',deletechallenge', value: 'Delete a challenge' },
        { name: 'Create Format', value: ',create name | difficulty | description | category | flag_format | flag | link\nExample: ,create "XSS Challenge" | Medium | Find the XSS | Web | flag{xxx} | flag{real_flag} | discord.com' },
        { name: 'Edit Format', value: ',editchallenge "Challenge Name" | field | new_value\nFields: name, difficulty, description, category, flag, points' }
    )
    .setColor('#FF0000');

client.once('ready', async () => {
    console.log(`Logged in as ${client.user.tag}!`);
    const db = await initializeDatabase();
    
    await db.exec(`
        CREATE TABLE IF NOT EXISTS challenges (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT UNIQUE,
            description TEXT,
            points INTEGER,
            base_points INTEGER,
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
});

// Helper functions
function getDifficultyColor(difficulty) {
    const colors = {
        'Easy': '#00FF00',
        'Normal': '#55FF55',
        'Medium': '#FFFF00',
        'Hard': '#FFA500',
        'Insane': '#FF0000'
    };
    return colors[difficulty] || '#0099FF';
}

async function updateChallengeAnnouncement(db, challengeName) {
    const channel = client.channels.cache.get(ANNOUNCEMENT_CHANNEL_ID);
    if (!channel) return;

    const challenge = await db.get(
        'SELECT * FROM challenges WHERE name = ?', 
        [challengeName]
    );
    
    if (!challenge) return;

    // Find the announcement message
    const messages = await channel.messages.fetch({ limit: 50 });
    const announcement = messages.find(m => 
        m.embeds.length > 0 && 
        m.embeds[0].title?.includes(challengeName)
    );

    if (announcement) {
        // Get current solver count
        const solverCount = await db.get(
            'SELECT COUNT(*) as count FROM submissions WHERE challenge_id = ?',
            [challenge.id]
        );

        const embed = new EmbedBuilder()
            .setTitle(`🚩 ${challenge.name}`)
            .setDescription(challenge.description)
            .addFields(
                { name: 'Difficulty', value: challenge.difficulty, inline: true },
                { name: 'Category', value: challenge.category, inline: true },
                { name: 'Current Points', value: challenge.points.toString(), inline: true },
                { name: 'Base Points', value: challenge.base_points.toString(), inline: true },
                { name: 'Solvers', value: solverCount.count.toString(), inline: true },
                { name: 'Flag Format', value: challenge.flag_format || 'None specified', inline: true },
                { name: 'Author', value: challenge.author_name, inline: true }
            )
            .setColor(getDifficultyColor(challenge.difficulty))
            .setFooter({ text: `Submit with ,flag ${challenge.name} <flag>` });

        await announcement.edit({ embeds: [embed] });
    }
}

client.on('messageCreate', async (message) => {
    if (message.author.bot) return;
    if (!message.content.startsWith(',')) return;

    const args = message.content.slice(1).trim().split(/ +/);
    const command = args.shift().toLowerCase();
    const db = await initializeDatabase();

    // Help command
    if (command === 'help') {
        await message.channel.send({ embeds: [helpEmbed] });
        return;
    }

    // Admin help command
    if (command === 'help-admin') {
        if (!message.member.roles.cache.has(process.env.ADMIN_ROLE_ID)) {
            const reply = await message.channel.send('❌ Admin only command!');
            setTimeout(() => reply.delete(), 5000);
            return;
        }
        await message.channel.send({ embeds: [adminHelpEmbed] });
        return;
    }

    // Ping command
    if (command === 'ping') {
        const latency = Date.now() - message.createdTimestamp;
        await message.channel.send(`🏓 Pong! Latency: ${latency}ms`);
        return;
    }

    // Status command
    if (command === 'status') {
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
        await message.channel.send({ embeds: [embed] });
        return;
    }

    // Leaderboard command
    if (command === 'leaderboard') {
        const topUsers = await db.all(
            `SELECT username, points FROM users 
            ORDER BY points DESC 
            LIMIT 10`
        );

        const embed = new EmbedBuilder()
            .setTitle('🏆 CTF Leaderboard')
            .setDescription(
                topUsers.map((user, index) => 
                    `${index + 1}. ${user.username} - ${user.points} points`
                ).join('\n') || 'No submissions yet!'
            )
            .setColor('#FFD700');

        await message.channel.send({ embeds: [embed] });
        return;
    }

    // New Challenges Command
    if (command === 'newchallenges') {
        try {
            const challenges = await db.all(
                'SELECT * FROM challenges ORDER BY created_at DESC LIMIT 3'
            );

            if (challenges.length === 0) {
                return message.author.send('❌ No challenges available yet!').catch(console.error);
            }

            const embed = new EmbedBuilder()
                .setTitle('🔥 Newest Challenges')
                .setDescription('Here are the 3 most recently added challenges')
                .setColor('#FF4500');

            challenges.forEach((challenge, index) => {
                embed.addFields(
                    {
                        name: `${index + 1}. ${challenge.name}`,
                        value: `**Difficulty:** ${challenge.difficulty}\n` +
                               `**Category:** ${challenge.category}\n` +
                               `**Current Points:** ${challenge.points}\n` +
                               `**Base Points:** ${challenge.base_points}\n` +
                               `**Author:** ${challenge.author_name}\n` +
                               `**Added:** ${new Date(challenge.created_at).toLocaleDateString()}`,
                        inline: false
                    }
                );
            });

            embed.setFooter({ text: 'Use ,flag <challenge> <flag> to submit your solution' });

            await message.author.send({ embeds: [embed] }).catch(console.error);
            
            // Confirm in the channel that DMs were sent
            const reply = await message.channel.send('📩 Check your DMs for the newest challenges!');
            setTimeout(() => reply.delete(), 5000);

        } catch (error) {
            console.error('New challenges error:', error);
            message.author.send('❌ Failed to fetch challenges. Please try again later.').catch(console.error);
        }
        return;
    }
    
    // Flag submission command
    if (command === 'flag') {
        try {
            await message.delete();
        } catch (error) {
            console.error('Failed to delete flag submission:', error);
        }

        const userFlag = args.pop();
        const challengeName = args.join(' ');

        if (!challengeName || !userFlag) {
            return message.author.send('❌ Usage: `,flag <challenge name> <flag>`').catch(console.error);
        }

        try {
            const challenge = await db.get(
                'SELECT * FROM challenges WHERE name = ?', 
                [challengeName]
            );

            if (!challenge) {
                return message.author.send(`❌ Challenge "${challengeName}" not found!`).catch(console.error);
            }

            // Check if already solved
            const existing = await db.get(
                'SELECT * FROM submissions WHERE user_id = ? AND challenge_id = ?',
                [message.author.id, challenge.id]
            );

            if (existing) {
                return message.author.send(`❌ You already solved ${challengeName}!`).catch(console.error);
            }

            // Verify flag
            if (userFlag !== challenge.flag) {
                return message.author.send('❌ Incorrect flag!').catch(console.error);
            }

            // Get current solver count and position
            const solverCount = await db.get(
                'SELECT COUNT(*) as count FROM submissions WHERE challenge_id = ?',
                [challenge.id]
            );
            const position = solverCount.count + 1;
            
            // Calculate points for this solver (decreases by 50 for each position)
            const pointsAwarded = Math.max(50, challenge.base_points - ((position - 1) * 50));

            // Update challenge's current points
            const newChallengePoints = Math.max(50, challenge.base_points - (position * 50));
            await db.run(
                'UPDATE challenges SET points = ? WHERE id = ?',
                [newChallengePoints, challenge.id]
            );

            // Add new solver
            await db.run(
                `INSERT INTO users (id, username, points) 
                VALUES (?, ?, ?)
                ON CONFLICT(id) DO UPDATE SET
                username = excluded.username,
                points = points + excluded.points`,
                [message.author.id, message.author.username, pointsAwarded]
            );

            await db.run(
                'INSERT INTO submissions (user_id, challenge_id, points_earned, position) VALUES (?, ?, ?, ?)',
                [message.author.id, challenge.id, pointsAwarded, position]
            );

            // Adjust points for all previous solvers (-50 points each)
            if (position > 1) {
                const previousSolvers = await db.all(
                    'SELECT user_id FROM submissions WHERE challenge_id = ? AND user_id != ?',
                    [challenge.id, message.author.id]
                );
                
                for (const solver of previousSolvers) {
                    await db.run(
                        'UPDATE users SET points = points - 50 WHERE id = ?',
                        [solver.user_id]
                    );
                    
                    await db.run(
                        'UPDATE submissions SET points_earned = points_earned - 50 WHERE user_id = ? AND challenge_id = ?',
                        [solver.user_id, challenge.id]
                    );
                }
            }

            // Prepare success message
            let positionMsg = '';
            if (position === 1) positionMsg = '🥇 First solver!';
            else if (position === 2) positionMsg = '🥈 Second solver!';
            else if (position === 3) positionMsg = '🥉 Third solver!';
            else positionMsg = `🏅 Position #${position}`;

            await message.author.send(
                `✅ Correct flag for **${challengeName}**!\n` +
                `${positionMsg}\n` +
                `+${pointsAwarded} points (Base: ${challenge.base_points}, Position adjustment: -${(position-1)*50})`
            ).catch(console.error);

            // Update announcement message
            await updateChallengeAnnouncement(db, challenge.name);

            // Announce first 3 solvers publicly
            if (position <= 3 && SUBMISSION_CHANNEL_ID) {
                const channel = await client.channels.fetch(SUBMISSION_CHANNEL_ID);
                const embed = new EmbedBuilder()
                    .setTitle(`${position === 1 ? '🥇' : position === 2 ? '🥈' : '🥉'} ${message.author.username} solved ${challengeName}!`)
                    .setColor(position === 1 ? '#FFD700' : position === 2 ? '#C0C0C0' : '#CD7F32')
                    .addFields(
                        { name: 'Points Awarded', value: pointsAwarded.toString(), inline: true },
                        { name: 'Position', value: `#${position}`, inline: true },
                        { name: 'Current Challenge Points', value: newChallengePoints.toString(), inline: true },
                        { name: 'Challenge Author', value: challenge.author_name, inline: true }
                    )
                    .setFooter({ text: `Total solvers: ${position}` });
                await channel.send({ embeds: [embed] });
            }

        } catch (error) {
            console.error('Flag submission error:', error);
            message.author.send('❌ Error processing your submission!').catch(console.error);
        }
        return;
    }

    // Create challenge command (Admin only)
    if (command === 'create') {
        if (!message.member.roles.cache.has(process.env.ADMIN_ROLE_ID)) {
            const reply = await message.channel.send('❌ Admin only command!');
            setTimeout(() => reply.delete(), 5000);
            return;
        }

        // Split by pipe but handle quoted sections properly
        const parts = message.content.slice(8).match(/[^|"']+|"([^"]*)"|'([^']*)'/g).map(p => p.trim().replace(/^["']|["']$/g, ''));
        
        if (parts.length < 6) {
            const reply = await message.channel.send(
                '❌ Format: ,create name | difficulty | description | category | flag_format | flag | [link]\n' +
                'Example: ,create "XSS Challenge" | Medium | "Find the XSS" | Web | flag{xxx} | flag{real_flag} | discord.com'
            );
            setTimeout(() => reply.delete(), 10000);
            return;
        }

        const [name, difficulty, description, category, flagFormat, flag, link = 'No Link Provided'] = parts;
        const basePoints = 1000; // Starting points for all challenges

        try {
            // Check if challenge already exists
            const existing = await db.get('SELECT 1 FROM challenges WHERE name = ?', [name]);
            if (existing) {
                const reply = await message.channel.send(`❌ Challenge "${name}" already exists!`);
                setTimeout(() => reply.delete(), 5000);
                return;
            }

            await db.run(
                'INSERT INTO challenges (name, description, points, base_points, flag, difficulty, category, flag_format, link, author_id, author_name) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
                [name, description, basePoints, basePoints, flag, difficulty, category, flagFormat, link, message.author.id, message.author.username]
            );

            // Create announcement embed
            const embed = new EmbedBuilder()
                .setTitle(`🚩 New Challenge: ${name}`)
                .setDescription(description)
                .addFields(
                    { name: 'Difficulty', value: difficulty, inline: true },
                    { name: 'Category', value: category, inline: true },
                    { name: 'Points', value: basePoints.toString(), inline: true },
                    { name: 'Flag Format', value: flagFormat, inline: true },
                    { name: 'Link', value: link, inline: true },
                    { name: 'Author', value: message.author.username, inline: true }
                )
                .setColor(getDifficultyColor(difficulty))
                .setFooter({ text: `Submit with ,flag ${name} <flag>` });

            if (ANNOUNCEMENT_CHANNEL_ID) {
                const channel = await client.channels.fetch(ANNOUNCEMENT_CHANNEL_ID);
                const announcement = await channel.send({ 
                    content: '@here New challenge available!',
                    embeds: [embed] 
                });
                await announcement.react('✅');
            }

            const reply = await message.channel.send('✅ Challenge created and announced!');
            setTimeout(() => reply.delete(), 5000);
        } catch (error) {
            console.error('Challenge creation error:', error);
            const reply = await message.channel.send('❌ Error creating challenge! See console for details.');
            setTimeout(() => reply.delete(), 5000);
        }
        return;
    }

    // Edit challenge command (Admin only)
    if (command === 'editchallenge') {
        if (!message.member.roles.cache.has(process.env.ADMIN_ROLE_ID)) {
            const reply = await message.channel.send('❌ Admin only command!');
            setTimeout(() => reply.delete(), 5000);
            return;
        }

        const parts = message.content.slice(14).split('|').map(p => p.trim());
        if (parts.length < 3) {
            const reply = await message.channel.send(
                '❌ Format: ,editchallenge "Challenge Name" | field | new_value\n' +
                'Fields: name, difficulty, description, category, flag, flag_format, link\n' +
                'Example: ,editchallenge "XSS Challenge" | difficulty | Hard'
            );
            setTimeout(() => reply.delete(), 10000);
            return;
        }

        const [challengeName, field, newValue] = parts;
        const allowedFields = ['name', 'difficulty', 'description', 'category', 'flag', 'flag_format', 'link'];

        if (!allowedFields.includes(field.toLowerCase())) {
            const reply = await message.channel.send(`❌ Invalid field. Allowed: ${allowedFields.join(', ')}`);
            setTimeout(() => reply.delete(), 5000);
            return;
        }

        try {
            // Special handling for name changes
            if (field.toLowerCase() === 'name') {
                // Verify new name doesn't exist
                const existing = await db.get(
                    'SELECT 1 FROM challenges WHERE name = ?',
                    [newValue]
                );
                if (existing) {
                    return message.channel.send('❌ A challenge with that name already exists!');
                }
            }

            const result = await db.run(
                `UPDATE challenges SET ${field} = ? WHERE name = ?`,
                [newValue, challengeName]
            );

            if (result.changes === 0) {
                const reply = await message.channel.send('❌ Challenge not found!');
                setTimeout(() => reply.delete(), 5000);
            } else {
                const reply = await message.channel.send(`✅ Challenge "${challengeName}" updated successfully!`);
                setTimeout(() => reply.delete(), 5000);
                
                // Update announcement if exists
                if (ANNOUNCEMENT_CHANNEL_ID && ['name', 'difficulty', 'description', 'category', 'flag_format'].includes(field.toLowerCase())) {
                    await updateChallengeAnnouncement(db, field.toLowerCase() === 'name' ? newValue : challengeName);
                }
            }
        } catch (error) {
            console.error('Edit challenge error:', error);
            const reply = await message.channel.send('❌ Error updating challenge!');
            setTimeout(() => reply.delete(), 5000);
        }
        return;
    }

    // Delete challenge command (Admin only)
    if (command === 'deletechallenge') {
        if (!message.member.roles.cache.has(process.env.ADMIN_ROLE_ID)) {
            const reply = await message.channel.send('❌ Admin only command!');
            setTimeout(() => reply.delete(), 5000);
            return;
        }

        const challengeName = args.join(' ');
        if (!challengeName) {
            const reply = await message.channel.send('❌ Specify challenge name: ,deletechallenge <name>');
            setTimeout(() => reply.delete(), 5000);
            return;
        }

        try {
            // First get challenge details for cleanup
            const challenge = await db.get(
                'SELECT * FROM challenges WHERE name = ?',
                [challengeName]
            );

            if (!challenge) {
                const reply = await message.channel.send('❌ Challenge not found!');
                setTimeout(() => reply.delete(), 5000);
                return;
            }

            // Remove all submissions and adjust user points
            const submissions = await db.all(
                'SELECT user_id, points_earned FROM submissions WHERE challenge_id = ?',
                [challenge.id]
            );

            for (const sub of submissions) {
                await db.run(
                    'UPDATE users SET points = points - ? WHERE id = ?',
                    [sub.points_earned, sub.user_id]
                );
            }

            // Now delete the challenge and submissions
            await db.run('DELETE FROM submissions WHERE challenge_id = ?', [challenge.id]);
            const result = await db.run('DELETE FROM challenges WHERE name = ?', [challengeName]);

            if (result.changes === 0) {
                const reply = await message.channel.send('❌ Challenge not found!');
                setTimeout(() => reply.delete(), 5000);
            } else {
                const reply = await message.channel.send(`✅ Challenge "${challengeName}" and all submissions deleted!`);
                setTimeout(() => reply.delete(), 5000);
            }
        } catch (error) {
            console.error('Delete challenge error:', error);
            const reply = await message.channel.send('❌ Error deleting challenge!');
            setTimeout(() => reply.delete(), 5000);
        }
        return;
    }
});

client.login(process.env.DISCORD_TOKEN).catch(err => {
    console.error('Login failed:', err);
    process.exit(1);
});
