# One Sip - Client

<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

The Frontend for One Sip, a React application that recommends drinks based on a menu photo and your taste preferences.

## Run Locally

Install dependencies:

```bash
npm install
```

Start the client:

```bash
npm run dev
```
The client will run on `http://localhost:5173`.

By default, the client expects the server to be at `http://localhost:3000`.

## Deployment

To deploy the Frontend Service:
- Set the environment variable `VITE_API_URL` to your Backend Service URL.
- Build command: `npm run build`
- Output directory: `dist`
