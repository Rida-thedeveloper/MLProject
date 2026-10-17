# Mockly — Deployment Guide

This file is auto-generated as a reference for the Render + Vercel deployment setup.

---

## Architecture

```
User → Vercel (React Frontend) → Render.com (FastAPI Backend)
```

---

## Backend — Render.com (Free)

### One-time setup (5 minutes)

1. Go to **[render.com](https://render.com/)** → Sign up / Login with GitHub
2. Click **"New +"** → **"Web Service"**
3. Connect your GitHub repo: `Rida-thedeveloper/MLProject`
4. Set the following:

| Field | Value |
|-------|-------|
| Root Directory | `backend` |
| Environment | `Python 3` |
| Build Command | `pip install -r requirements.txt` |
| Start Command | `uvicorn main:app --host 0.0.0.0 --port $PORT --workers 1` |

5. Under **"Environment Variables"**, add:

| Key | Value |
|-----|-------|
| `GROQ_API_KEY` | *(your Groq API key from [console.groq.com](https://console.groq.com))* |
| `FRONTEND_URL` | *(your Vercel URL after deploying frontend, e.g. `https://mockly.vercel.app`)* |

6. Click **"Create Web Service"**
7. Wait ~5 minutes. Your backend URL will be something like:
   `https://mockly-backend.onrender.com`

> **Note:** Free tier sleeps after 15 min of inactivity. First request may take ~30 seconds to wake up.

---

## Frontend — Vercel (Free)

### One-time setup (3 minutes)

1. Go to **[vercel.com](https://vercel.com/)** → Sign up / Login with GitHub
2. Click **"Add New Project"** → Import `Rida-thedeveloper/MLProject`
3. Set the following:

| Field | Value |
|-------|-------|
| Root Directory | `frontend` |
| Framework Preset | `Vite` |
| Build Command | `npm run build` |
| Output Directory | `dist` |

4. Under **"Environment Variables"**, add:

| Key | Value |
|-----|-------|
| `VITE_API_URL` | *(your Render backend URL from above, e.g. `https://mockly-backend.onrender.com`)* |
| `VITE_SUPABASE_URL` | `https://dhcrovrftizevqtninde.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRoY3JvdnJmdGl6ZXZxdG5pbmRlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgzMTYyNDYsImV4cCI6MjEwMzg5MjI0Nn0.nVRjpAUeRBvezZIPcK-KjwUCdhcSBXd7oiUycFLXCBI` |

5. Click **"Deploy"**
6. Your live URL will be something like: `https://mockly.vercel.app`

---

## After Both Are Live

Go back to **Render dashboard** → Your Backend service → **Environment** → Update `FRONTEND_URL` with your actual Vercel URL → **Save** (backend will redeploy automatically).

---

## Local Development (no changes needed)

```bash
# Backend
cd backend && uvicorn main:app --host 127.0.0.1 --port 8000

# Frontend  
cd frontend && npm run dev
```

Local `.env.local` already points to `http://localhost:8000`.
