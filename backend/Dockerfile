# Build Stage for Frontend
FROM node:18-alpine as frontend-build

WORKDIR /app/frontend

# Copy frontend specific files
COPY frontend/package*.json ./
RUN npm ci

COPY frontend/ .
RUN npm run build


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
COPY --from=frontend-build /app/backend/static/dist /app/static/dist

# Create uploads directory
RUN mkdir -p uploads/branding

# Command to run the application
# Use shell script to run migrations before start in production
CMD ["sh", "-c", "alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port 8000"]
