# Mockly — Deployment Guide (No Credit Card Required)

## Architecture

```
User → Vercel (React Frontend) ──── HTTPS ──→ Hugging Face Spaces (FastAPI Backend)
```

Both platforms are **100% free** with **no credit card** required.

---

## Backend — Hugging Face Spaces (Free, No Credit Card)

### Setup Steps

1. Go to **[huggingface.co](https://huggingface.co/)** → Create free account (just email, no card)

2. Click **"New Space"** → Fill in:
   - **Owner:** your HF username
   - **Space name:** `mockly-backend`
   - **SDK:** **Docker** *(important!)*
   - **Hardware:** CPU basic (Free)
   - **Visibility:** Public

3. Click **"Create Space"**

4. On the Space page, go to **Settings → Variables and Secrets** → Add:

   | Key | Value |
   |-----|-------|
   | `GROQ_API_KEY` | *(your Groq API key)* |
   | `FRONTEND_URL` | *(your Vercel URL after step below, e.g. `https://mockly.vercel.app`)* |

5. Clone your HF Space and push backend code:
   ```bash
   git clone https://huggingface.co/spaces/YOUR_USERNAME/mockly-backend
   cd mockly-backend
   # Copy all files from Mockly/backend/ into this folder
   git add . && git commit -m "deploy" && git push
   ```

6. HF will build the Docker image automatically (~5 min). Your backend URL:
   `https://YOUR_USERNAME-mockly-backend.hf.space`

> **Note:** Free HF Spaces may sleep after inactivity. First request wakes it up in ~10 seconds.

---

## Frontend — Vercel (Free, No Credit Card)

1. Go to **[vercel.com](https://vercel.com/)** → Sign up with GitHub (no card needed)
2. Click **"Add New Project"** → Import `Rida-thedeveloper/MLProject`
3. Set:

   | Field | Value |
   |-------|-------|
   | Root Directory | `frontend` |
   | Framework Preset | `Vite` |

4. Add **Environment Variables**:

   | Key | Value |
   |-----|-------|
   | `VITE_API_URL` | *(your HF Space URL, e.g. `https://YOUR_USERNAME-mockly-backend.hf.space`)* |
   | `VITE_SUPABASE_URL` | `https://dhcrovrftizevqtninde.supabase.co` |
   | `VITE_SUPABASE_ANON_KEY` | *(your supabase anon key)* |

5. Click **"Deploy"** → Done!

---

## Local Development (unchanged)

```bash
# Backend
cd backend && uvicorn main:app --host 127.0.0.1 --port 8000

# Frontend
cd frontend && npm run dev
```
