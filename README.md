
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
npm install discord.js dotenv sqlite sqlite3
```

### 3. Set Up Environment Variables

Create a `.env` file and populate it with your bot token, role ID, and channel IDs.

### 4. Run the Bot

```bash
node index.js
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


---

Any Question? Join Our Discord [DTEmpire](https://discord.com/invite/JYNCNAxPx7)

Test Server: [Attack On Hash Function](https://discord.com/invite/uDaXaUWEF2)
![Screenshot 2025-04-30 144612](https://github.com/user-attachments/assets/e67bc714-7e9e-40af-b86a-0394ac5c36e2)
![Screenshot 2025-04-30 144619](https://github.com/user-attachments/assets/9d8003c4-f68e-4ed7-b5c6-1028afe4447f)
![Screenshot 2025-04-30 144625](https://github.com/user-attachments/assets/5eb29eba-2859-4a9e-bd1f-82929a7b8763)
![Screenshot 2025-04-30 144638](https://github.com/user-attachments/assets/86ec8716-8f0d-4320-85f1-5d4e05d9e28a)


