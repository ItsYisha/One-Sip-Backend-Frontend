# One Sip - Server

The Backend for One Sip, powered by Gemini 2.0 Flash.

## Run Locally

Install dependencies:

```bash
npm install
```

Create a `.env` file in this directory and add your Gemini API Key:

```env
GEMINI_API_KEY=your_api_key_here
PORT=3000
```

Start the server:

```bash
npm run dev
```
The server will run on `http://localhost:3000`.

## Deployment

To deploy the Backend Service:
- Set the environment variable `GEMINI_API_KEY`.
- The server listens on port defined by `PORT` (default 3000).
