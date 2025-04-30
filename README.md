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
```js
points = Math.max(100, 1000 - (solves * 50));
