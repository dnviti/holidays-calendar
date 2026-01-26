.PHONY: install run-backend run-frontend build-frontend dev

install:
	cd backend && python3 -m venv venv --copies && ./venv/bin/pip install -r requirements.txt
	cd frontend && npm install

run-backend:
	cd backend && ./venv/bin/uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

run-frontend:
	cd frontend && npm run dev

build-frontend:
	cd frontend && npm run build

dev:
	make -j 2 run-backend run-frontend
