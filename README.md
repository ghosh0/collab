# Collab — Real-Time Collaborative Whiteboard

A modern, full-stack real-time collaborative whiteboard application built with **Next.js**, **Excalidraw**, **Yjs (CRDT)**, **WebSockets**, and **Prisma (PostgreSQL)**.

---

## ✨ Features

- 🎨 **Interactive Infinite Canvas:** Powered by Excalidraw for smooth drawing, shapes, diagrams, and text.
- ⚡ **Real-Time Collaboration:** Conflict-free document synchronization using **Yjs CRDTs** and WebSockets.
- 🖱️ **Live Multi-User Cursors:** Real-time user presence and cursor tracking across active boards.
- 🔐 **Authentication & Sessions:** User authentication and session management via **Better Auth**.
- 🛡️ **Role-Based Permissions:** Board access control with **Owner**, **Editor**, and **Viewer** roles.
- 💾 **State Persistence:** Efficient auto-persistence of board canvas state to PostgreSQL.

---

## 🛠️ Tech Stack

### Frontend
- **Framework:** Next.js (App Router)
- **UI & Styling:** React, TailwindCSS, Radix UI / Shadcn UI, Lucide Icons
- **Canvas Engine:** Excalidraw (`@excalidraw/excalidraw`)
- **CRDT Engine:** Yjs (`yjs`)

### Backend
- **Server:** Node.js, Express
- **Real-Time:** WebSockets (`ws`)
- **Database & ORM:** PostgreSQL, Prisma ORM

---

## 📁 Repository Structure

```text
collab/
├── frontend/             # Next.js Application (Vercel)
│   ├── app/              # App Router pages & API routes
│   ├── components/       # UI components & Excalidraw integration
│   └── prisma/           # Frontend database schema
│
└── backend/              # Node.js WebSocket & Express Server (Render)
    ├── server.ts         # Server entrypoint
    └── prisma/           # Backend database schema
```

---

## 🚀 Getting Started

### Local Setup

1. **Clone the Repository:**
   ```bash
   git clone https://github.com/ghosh0/collab.git
   cd collab
   ```

2. **Backend Setup:**
   ```bash
   cd backend
   npm install
   npx prisma generate
   npm run dev
   ```

3. **Frontend Setup:**
   ```bash
   cd frontend
   npm install
   npx prisma generate
   npm run dev
   ```

---

## 🌐 Deployment

- **Frontend:** Deployed on **Vercel** (`npx prisma generate && next build`)
- **Backend:** Deployed on **Render** (`npm install && npm run build` → `npm start`)
