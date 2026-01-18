# One Sip - AI Sommelier

<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

A React application that recommends drinks based on a menu photo and your taste preferences, powered by Gemini 2.0 Flash.

## Project Structure

This project is separated into two parts:
- **client/**: The Frontend (React + Vite)
- **server/**: The Backend (Node.js + Express)

## Run Locally

### 1. Server Setup

Navigate to the server directory and install dependencies:

```bash
cd server
npm install
```

Create a `.env` file in the `server/` directory and add your Gemini API Key:

```env
GEMINI_API_KEY=your_api_key_here
PORT=3000
```

Start the server:

```bash
npm run dev
```
The server will run on `http://localhost:3000`.

### 2. Client Setup

Open a new terminal, navigate to the client directory and install dependencies:

```bash
cd client
npm install
```

Start the client:

```bash
npm run dev
```
The client will run on `http://localhost:5173`.

By default, the client expects the server to be at `http://localhost:3000`.

## Deployment (Zeabur)

To deploy on Zeabur with separate services:

1. **Backend Service**:
   - Create a Service selecting the `server` directory (or root, but specify build/start command for server).
   - Set the environment variable `GEMINI_API_KEY`.
   - The server listens on port defined by `PORT` (default 3000, Zeabur usually handles this).

2. **Frontend Service**:
   - Create a Service selecting the `client` directory.
   - Set the environment variable `VITE_API_URL` to your Backend Service URL (e.g., `https://one-sip-server.zeabur.app`).
   - Build command: `npm run build`
   - Output directory: `dist`

Enjoy your AI Sommelier!
