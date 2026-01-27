# Build Stage for Frontend
FROM node:18-alpine as frontend-build

WORKDIR /app/frontend

# Copy frontend specific files
COPY frontend/package*.json ./
RUN npm ci

COPY frontend/ .

# Override the vite output directory for Docker build
RUN npm run build -- --outDir=dist


# Run Stage for Backend
FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
  build-essential \
  libpq-dev \
  && rm -rf /var/lib/apt/lists/*

# Install python dependencies
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY backend/ .

# Copy frontend build artifacts
COPY --from=frontend-build /app/frontend/dist /app/static/dist

# Create uploads directory
RUN mkdir -p uploads/branding

# Command to run the application
# Use shell script to run migrations before start in production
CMD ["sh", "-c", "alembic upgrade head && uvicorn app.main:app --host ${HOST:-0.0.0.0} --port ${PORT:-8000}"]
