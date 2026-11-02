<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://appchat-azq6.onrender.com/assets/aistudio/Futuristic_Social_Creativity_Banner_af067fcc.png" />
</div>

# Aura

Aura is a React social discovery, visual boards, private messaging, and dating app.

## Netlify deployment

The React client is ready to deploy to Netlify:

- Build command: `npm run build`
- Publish directory: `dist`
- Node version: `22`

`netlify.toml` contains these settings and the SPA fallback required for client-side routes.

Important: Netlify hosts the client build only. The app's Express API and Socket.IO server in `server.ts` must run on a separate Node-compatible host (for example Render, Railway, Fly.io, or a VPS). The frontend currently calls the API and Socket.IO at the same origin, so use a reverse proxy/custom domain or update the client to point to the API host before enabling authentication, messaging, and other server-backed features. The current server stores users and content in memory, so it also needs a persistent database and file storage for production use.

## Run locally

**Prerequisites:**  Node.js


1. Install dependencies: `npm install`
2. Copy `.env.example` to `.env` and fill in the required values.
3. Run the full client and API server: `npm run dev`

For a client-only production build, run `npm run build` and publish `dist`.

### Voice and video calls

Calls use WebRTC. Public STUN servers are included for direct connections, but mobile and restricted networks usually require a TURN relay. Set `VITE_TURN_URL`, `VITE_TURN_USERNAME`, and `VITE_TURN_CREDENTIAL` in the frontend build environment (Netlify or Render) using credentials from a TURN provider. These values are bundled into the browser build, so use short-lived or provider-scoped credentials where available.
