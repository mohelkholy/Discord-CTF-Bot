
---

# 🎯 Discord CTF Challenge Bot

A powerful Discord bot to manage, host, and track CTF (Capture The Flag) challenges in your server.

> Supports dynamic scoring, admin moderation tools, real-time flag submissions, and leaderboard tracking!

---

## 🚀 Features

- ✅ Create, edit, and delete CTF challenges via modal
- 🧩 Flag submission with automatic validation
- 📉 Dynamic scoring (points decrease with each solve)
- 📢 Auto-announcement of new challenges
- 🧑‍🤝‍🧑 Leaderboards and user statistics
- 🔐 Separate help commands for users and admins
- 💾 SQLite-based storage

---

## 🧠 Dynamic Points System

Each challenge starts with **1000 base points**, which decrease as more users solve the box.

### 📉 Point Reduction Formula:
js
points = Math.max(100, 1000 - (solves * 50));


- First solver: 1000 points  
- Each subsequent solver: -50 points  
- Minimum floor: 100 points

This encourages fast solving and fair competition.

---

## 📜 Help Commands

### 👤 For All Users

```bash
,help
```

Displays:
- How to submit a flag
- View personal stats and rank
- Access leaderboard
- General usage tips

---

### 👑 For Admins

```bash
,help-admin
```

Displays:
- How to create/edit/delete challenges
- Challenge format and category management
- Required bot permissions
- Announcement/channel settings

> 🔒 Admin-only access. Set your admin role in `.env` as shown below:

```env
ADMIN_ROLE_ID=your_discord_admin_role_id
```

---

## ⚙️ Environment Configuration (`.env`)

Create a `.env` file in your root directory with the following:

```env
DISCORD_TOKEN=your_bot_token_here
ADMIN_ROLE_ID=your_discord_admin_role_id
ANNOUNCEMENT_CHANNEL=channel_id_for_new_challenge_notifications
SUBMISSION_CHANNEL=channel_id_for_flag_submissions
```

You can refer to `.env.example` for the base template.

---

## 🧱 Database Schema (SQLite)

The bot uses SQLite to store persistent data:

### Tables:

- `users`: ID, username, total points, challenges solved, rank
- `challenges`: ID, name, flag, category, difficulty, dynamic point value
- `submissions`: challenge_id, user_id, timestamp, awarded points

---

## 📦 Installation

### 1. Clone the Repository

```bash
git clone https://github.com/hyperdargo/Discord-CTF-Bot/
cd Discord-CTF-Bot
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Set Up Environment Variables

Create a `.env` file and populate it with your bot token, role ID, and channel IDs.

### 4. Run the Bot

```bash
node bot.js
```

---

## 🔧 Admin Challenge Modal

Admins can create and edit challenges directly using a modal interface. Fields include:

- `name`: challenge title  
- `difficulty`: Easy / Medium / Hard  
- `description`: short description  
- `category`: e.g., Web, Crypto, Forensics  
- `flag_format`: example flag format  
- `flag`: actual correct flag  
- `links`: optional challenge resources

---

## 🤝 Contributing

Contributions, suggestions, and PRs are welcome!

Please open an issue or submit a pull request for any ideas or bugs.

---

## 📄 License

This project is licensed under the MIT License.
```

---

Let me know if you'd like a `.env.example` file or a visual badge section at the top!
