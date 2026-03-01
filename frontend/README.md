# Yelp Prototype

A Yelp-style restaurant discovery and review platform built with FastAPI + React.

## Tech Stack
- Backend: Python 3.11 + FastAPI
- Frontend: React + Vite + TailwindCSS
- Database: MySQL
- Auth: JWT

## Setup Instructions

### Backend
```bash
cd backend
python3.11 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

### Environment Variables
Create a `.env` file in `/backend` with:
```
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=yelp_prototype
JWT_SECRET=your_secret
JWT_ALGORITHM=HS256
JWT_EXPIRE_MINUTES=1440
```