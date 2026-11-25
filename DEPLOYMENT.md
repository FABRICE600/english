# LinguaLearn Deployment Guide (Vercel + Render + MongoDB Atlas)

## 1. Environment Variables
Copy `.env.example` to `.env` for local or server environments and set:
- `MONGODB_URI`: Your MongoDB Atlas SRV connection string (`mongodb+srv://...`)
- `JWT_SECRET`: A strong random 64-character secret for signing JWT tokens
- `PORT`: `3000` (default)
- `CLIENT_URL`: Your deployed Vercel frontend URL (e.g. `https://lingualearn.vercel.app`)
- `VITE_API_URL`: Your deployed Render backend API URL (e.g. `https://lingualearn-api.onrender.com/api`)

## 2. Database Setup (MongoDB Atlas)
1. Create a free M0 cluster on MongoDB Atlas.
2. Create a database user with read/write permissions and allow network access (`0.0.0.0/0` or Render outbound IPs).
3. Set `MONGODB_URI` in Render's environment variables. On first startup, `backend/services/store.ts` automatically seeds all 11 collections (`users`, `courses`, `lessons`, `enrollments`, `assignments`, `quizzes`, `questions`, `submissions`, `results`, `notifications`, `progress`) if empty.

## 3. Backend Deployment (Render)
- Included `render.yaml` configures a Node.js web service:
  - Build Command: `npm install && npm run build`
  - Start Command: `npm start`
- Set `NODE_ENV=production`, `MONGODB_URI`, `JWT_SECRET`, and `CLIENT_URL` in Render Dashboard.

## 4. Frontend Deployment (Vercel)
- Included `vercel.json` configures Vite SPA builds (`npm run build`, output directory `dist`) and client-side route rewrites.
- Set `VITE_API_URL=https://<your-render-service>.onrender.com/api` in Vercel Project Settings.
