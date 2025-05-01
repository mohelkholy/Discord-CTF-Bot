---

# 🎯 Discord CTF Challenge Bot

A powerful and lightweight Discord bot for hosting and managing Capture The Flag (CTF) challenges in your server.

> ✨ Includes dynamic scoring, real-time flag validation, modals for admins, and a competitive leaderboard system.

---

## 🚀 Features

- 🛠️ Create, edit, and delete CTF challenges via interactive modals  
- 🧩 Flag submission with automatic validation  
- 📉 Dynamic point system based on number of solves  
- 📢 Auto-announcement of new challenges  
- 🧑‍🤝‍🧑 User profiles and leaderboard  
- 🔐 Separate help commands for users and admins  
- 💾 Data stored locally using SQLite

---

## 🧠 Dynamic Points System

Each challenge begins with **1000 base points**. As more players solve it, the point value decreases using the formula below:

```js
points = Math.max(100, 1000 - (solves * 50));
```

- 🥇 First solver: 1000 points  
- 📉 Each additional solver: -50 points  
- ⛔ Minimum value: 100 points  

This scoring system promotes fast solving and balanced competition.

---

## 📜 Help Commands

### 👤 Normal Users

```bash
,help
```

Shows:
- How to submit flags  
- View user stats and rank  
- Access leaderboard  
- General usage guide  

---

### 👑 Admins

```bash
,help-admin
```

Displays:
- Challenge management tools  
- Format and category setup  
- Required bot permissions  
- Announcement and submission channel setup  

> 🔐 To use admin commands, set your admin role ID in the `.env` file:

```env
ADMIN_ROLE_ID=your_discord_admin_role_id
```

---

## ⚙️ Configuration (`.env`)

Create a `.env` file and fill in the following:

```env
DISCORD_TOKEN=your_bot_token_here
ADMIN_ROLE_ID=your_discord_admin_role_id
ANNOUNCEMENT_CHANNEL=channel_id_for_announcements
SUBMISSION_CHANNEL=channel_id_for_flag_submissions
```

Refer to `.env.example` for a prefilled template.

---

## 🧱 Database (SQLite)

The bot uses SQLite to persist all data.

### Tables:
- `users` – User ID, username, total points, rank, challenges solved  
- `challenges` – Challenge info: name, category, difficulty, flag, points  
- `submissions` – Track when users submit flags and earn points  

---

## 📦 Installation

### 1. Clone the Repository

```bash
git clone https://github.com/hyperdargo/Discord-CTF-Bot
cd Discord-CTF-Bot
```

### 2. Install Dependencies

```bash
npm install
npm install discord.js dotenv sqlite sqlite3
```

### 3. Configure Environment

Copy `.env.example` to `.env` and fill in your credentials.

### 4. Start the Bot

```bash
node index.js
```

---

## 🧾 Admin Challenge Modal

Admins can manage challenges directly through Discord modals. Fields include:

- **name** – Challenge name  
- **difficulty** – Easy / Medium / Hard  
- **description** – Brief explanation  
- **category** – Web, Crypto, Forensics, etc.  
- **flag_format** – Expected format (e.g., `flag{}`)  
- **flag** – Actual flag  
- **links** – Optional resources  

---

## 📁 Release Package

Release archive includes:

- `index.js` – Main bot logic  
- `.env.example` – Config template  
- `package.json` – Node.js dependency file  
- `requirements.txt` – Optional dependencies  
- `README.md` – Full setup & usage guide

Supported archive formats: `.zip`, `.tar`, `.rar`, `.7z`

---

## 🤝 Contributing

We welcome pull requests, suggestions, and bug reports.  
Feel free to open an issue or fork the project.

---

## 📄 License

This project is released under the **MIT License**.

---

## 🔗 Join Our Community

- 🎮 **Main Discord**: [DTEmpire](https://discord.com/invite/JYNCNAxPx7)  
- 🧪 **Test Public Bot**: [DTEmpire CTF](https://discord.com/oauth2/authorize?client_id=1367446432084394014&permissions=11280&integration_type=0&scope=bot)

---

## 📸 Preview

![Screenshot 1](https://github.com/user-attachments/assets/e67bc714-7e9e-40af-b86a-0394ac5c36e2)

![Screenshot 2](https://github.com/user-attachments/assets/9d8003c4-f68e-4ed7-b5c6-1028afe4447f)

![Screenshot 3](https://github.com/user-attachments/assets/5eb29eba-2859-4a9e-bd1f-82929a7b8763)

![Screenshot 4](https://github.com/user-attachments/assets/86ec8716-8f0d-4320-85f1-5d4e05d9e28a)

---
