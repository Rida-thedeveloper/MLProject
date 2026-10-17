# ── Hugging Face Spaces — Mockly FastAPI Backend ──────────────────────────
# Free tier: CPU basic (2 vCPU, 16 GB RAM) — no credit card required
# HF Spaces ONLY listens on port 7860 — do NOT change this.
# ──────────────────────────────────────────────────────────────────────────

FROM python:3.11-slim

WORKDIR /code

# Install system dependencies for librosa / ffmpeg
RUN apt-get update && apt-get install -y \
    ffmpeg \
    libsndfile1 \
    && rm -rf /var/lib/apt/lists/*

# Copy and install Python dependencies first (layer cache optimisation)
COPY ./requirements.txt /code/requirements.txt
RUN pip install --no-cache-dir --upgrade -r /code/requirements.txt

# Copy all backend source code
COPY . /code

# HF Spaces runs containers as non-root user 1000
RUN useradd -m -u 1000 user
USER user
ENV HOME=/home/user \
    PATH=/home/user/.local/bin:$PATH \
    PORT=7860

EXPOSE 7860

# Start FastAPI on port 7860 (HF Spaces requirement)
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "7860", "--workers", "1"]
