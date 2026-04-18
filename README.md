# 🎮 Tic Tac Toe

A modern Tic Tac Toe game built with Angular, featuring AI gameplay, smooth animations, sound effects, and PWA support for an app-like experience.

---

## 🚀 Live Demo

👉 https://tic-tac-toe-tau-nine-32.vercel.app/

---

## 🧩 Features

- 🤖 **Play against a smart AI or a friend**
- 🔄 **Instant switching between game modes**
- 🧠 **AI can win, block, or make random moves**
- 🔊 **Sound effects (click, win, draw)**
- ✨ **Animated UI with glowing effects**
- 🌌 **Dynamic background visuals**
- 🎉 **Victory celebration animations**
- 📱 **Fully responsive (mobile & desktop)**
- 📦 **Installable PWA (works offline)**
- 🔑 **Google Authentication**
- ☁️ **Firestore Database**  
- 🎮 **Real-time Online Multiplayer**  
- 📊 **Player Statistics Tracking**
- 🔑 **Google Authentication**  
- ☁️ **Firestore Database**  
- 🎮 **Real-time Online Multiplayer**  
- 📊 **Player Statistics Tracking**  

---

## 🛠 Tech Stack

- Angular
- TypeScript
- SCSS
- HTML
- Angular PWA
- Vercel
- FireBase

---

## 📦 Installation

```bash
npm install
```

---

## ▶️ Run Locally

```bash
ng serve
```

Open in browser:

```
http://localhost:4200
```

---

## 🏗 Build for Production

```bash
ng build --configuration production
```

---

## 📁 Project Structure

```bash
src/
  app/
    board/            # game board logic, UI, and online gameplay
    dashboard/        # player stats and win/loss history
    account/          # user profile and auth page
    services/         # Firebase auth, Firestore, and game services
    square/           # individual cell component
    app.component.ts   # root app shell
    app.routes.ts      # route definitions
  assets/
    sounds/            # click, win, draw effects
    icons/             # PWA icons
  environments/        # environment configs
  index.html
  main.ts              # app bootstrap
---
```

## 🔊 Sound Files

Located in:

```bash
src/assets/sounds/
```

Required:

- click.mp3
- win.mp3
- draw.mp3

---

## 📸 Screenshots

![Game UI](./screenshots/game.png)
![Winning State](./screenshots/win.png)
![Draw State](./screenshots/draw.png)

---

## 📱 PWA Support

- Installable on desktop & mobile
- Runs fullscreen like a native app
- Works offline after first load

---

## 🌍 Deployment

Deployed using Vercel

Build command:

```bash
ng build --configuration production
```

Output directory:

```bash
dist/tic-tac-toe
```

---
## 🔥 Firebase Setup

This project uses **Firebase** for authentication, database, and real-time gameplay.

### 📦 Configuration

Firebase is configured in the Angular environment files:

```ts
export const environment = {
  production: false,
  firebase: {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_PROJECT_ID.appspot.com",
    messagingSenderId: "YOUR_SENDER_ID",
    appId: "YOUR_APP_ID"
  }
};
```
---

## 📝 Notes

- AI mode resets the board when switching modes
- Dynamic player turn indicator
- Includes sound & animation feedback

---

## 📊 Badges

![Angular](https://img.shields.io/badge/Angular-Framework-red)
![TypeScript](https://img.shields.io/badge/TypeScript-Language-blue)
![PWA](https://img.shields.io/badge/PWA-Enabled-green)
![Vercel](https://img.shields.io/badge/Deployed-Vercel-black)

---

## ⭐ Future Improvements

- Difficulty levels for AI
- Custom themes

---

## 👨‍💻 Author

Fares Ayman

GitHub: https://github.com/Faresaymann
