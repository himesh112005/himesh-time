# Himesh Time — Daily Routine & Task Planner

A 100% offline-first Progressive Web App (PWA) built for Himesh Bhai. Installable on Android and desktop as a standalone app.

---

## Core Capabilities

### 1. Flexible Habit & Task Management
- **No Locked Tasks:** Every single task and routine is completely deletable and customizable.
- **Permanent Routine vs. Single-Day Task:** 
  - Convert any single-day task into a permanent daily repeating habit with one tap.
  - Remove daily repetition from any habit while keeping today's record intact.
  - When deleting a routine, choose between **"Delete for today only"** or **"Delete permanently from all future days"**.
- **Quick Edit:** Edit task titles and categories on the fly.
- **Initial Folding:** Groups with more than 6 tasks show the first 6 with a clean "Show more" toggle to avoid vertical clutter.

### 2. Daily Focus & Deadline Tracker
- Set your primary #1 priority for each day.
- Optional target deadline time with automatic 12-hour format conversion.
- Quick checkbox completion.

### 3. Clean Visual Design
- **Solid Base + Single Accent:** Pure dark base (`#09090b`) with a single crisp amber accent (`#f59e0b`).
- **Clean Borders:** Dropped heavy drop-shadows and gradients in favor of sharp, minimalist 1px borders.
- **Modern Typography:** Headings in **Plus Jakarta Sans** with tight letter-spacing (`-0.02em`), body in **DM Sans** with generous readability (`line-height: 1.65`).
- **SVG Iconography:** Clean vector icons for high clarity and consistency.
- **Mobile Friendly:** Minimum 44×44px touch targets across all interactive controls.

### 4. Progress Summary & Metrics
- Split overview metric displaying completion percentage and ratio (e.g. `10/12 Done`).
- Category filters: Spiritual, Study, Career, Personal, Single Day.
- Celebration confetti on reaching 100% completion.

### 5. Settings & Offline Backup
- Offline IndexedDB persistence with zero cloud dependencies.
- Full JSON export and backup.
- Ability to restore default routine templates at any time.

---

## How to Run & Install

### Quick Launch on PC
Double-click `Start-App.bat` or run:
```bash
npx serve -l 3000 .
```
Open `http://localhost:3000` in your browser.

### Install on Android / Mobile
1. Open the hosted URL or local IP in **Google Chrome** on your mobile device.
2. Tap the **menu (⋮)** in Chrome and select **"Add to Home screen"** or **"Install app"**.
3. Launch directly from your app drawer with native fullscreen experience.
