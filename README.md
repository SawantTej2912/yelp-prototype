# Yelp Prototype

A Yelp-style restaurant discovery and review platform built with FastAPI + React.

## Tech stack

- **Backend:** Python 3.11 + FastAPI (four microservices + shared code + dev monolith)
- **Frontend:** React + Vite + TailwindCSS
- **MySQL:** primary relational data (existing schema)
- **MongoDB:** reserved for sessions / chat (Phase 3+), connection via `shared/mongo.py`
- **Kafka + Zookeeper:** async messaging (Phase 3+)
- **Auth:** JWT

---

## Quick links

| Mode | API | Frontend |
|------|-----|----------|
| **Local dev (monolith)** | `http://localhost:8000` | `http://localhost:5173` |
| **Docker Compose** | `http://localhost:8000` (nginx gateway to all four services) | `http://localhost:5173` |
| **Microservices direct (local or Docker)** | `http://localhost:8001` … `8004` | (configure `VITE_API_BASE` if you add a custom gateway) |

---

## Environment variables

Copy `backend/.env.example` to `backend/.env` and adjust.

| Variable | Purpose |
|----------|---------|
| `DB_HOST` | MySQL host: `localhost` (local) or `mysql` (Docker) |
| `DB_PORT` | MySQL port (default `3306`) |
| `DB_USER` / `DB_PASSWORD` | MySQL credentials |
| `DB_NAME` | Database name (`yelp_prototype`) |
| `MONGO_URI` | e.g. `mongodb://localhost:27017/yelp_prototype` or `mongodb://mongodb:27017/yelp_prototype` in Docker |
| `KAFKA_BOOTSTRAP_SERVERS` | e.g. `localhost:9092` or `kafka:9092` in Docker |
| `JWT_SECRET` | Required; generate with `python3 -c "import secrets; print(secrets.token_hex(32))"` |
| `JWT_ALGORITHM` | Default `HS256` |
| `JWT_EXPIRE_MINUTES` | Default `1440` |
| `GEMINI_API_KEY` | Optional (AI assistant) |
| `TAVILY_API_KEY` | Optional (web search) |

Docker Compose **overrides** `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `MONGO_URI`, and `KAFKA_BOOTSTRAP_SERVERS` for the container network. Other values (e.g. `JWT_SECRET`, API keys) are read from `backend/.env`.

---

## Run the full stack with Docker

**Prerequisites:** Docker + Docker Compose v2.

1. **Create `backend/.env`** (at least `JWT_SECRET`; MySQL password is overridden for compose — see below):
   ```bash
   cp backend/.env.example backend/.env
   # Edit backend/.env — set JWT_SECRET and any API keys
   ```

2. **Start everything:**
   ```bash
   docker compose up -d --build
   ```

3. **Open:**
   - Frontend: [http://localhost:5173](http://localhost:5173)
   - Unified API (nginx → microservices): [http://localhost:8000/docs](http://localhost:8000/docs)
   - MySQL: `localhost:3307` on the **host** (mapped to the container; avoids conflict with a local MySQL on 3306). User `root`, default password `yelp_root_dev` unless you set `MYSQL_ROOT_PASSWORD`.
   - MongoDB: `localhost:27017`
   - Zookeeper: `localhost:2181`
   - Kafka: `localhost:9092`
   - Services: `8001`–`8004` (see `docker-compose.yml`)

**Default MySQL root password in compose** is `yelp_root_dev` (configurable with `MYSQL_ROOT_PASSWORD`). The Python services use the same value for `DB_PASSWORD` so they can connect as `root`.

**First MySQL start:** `docker/mysql/init.sql` creates all 8 tables in `yelp_prototype`. If you change the MySQL data volume, the init scripts run again only on a **fresh** volume.

**API gateway:** The browser and the built React app use **`http://localhost:8000`**. Nginx (`api_gateway`) routes paths to the four services (claim → owner, `/auth` / `/users` / `/ai-assistant` → user, `/restaurants` → restaurant, `/reviews` & `/favorites` → review, `/owner` → owner). Static uploads are proxied to `user_service`.

**Apple Silicon:** If Confluent images fail to start, set `platform: linux/amd64` under `kafka` and `zookeeper` in `docker-compose.yml` (x86_64 emulation).

**Stop:**
```bash
docker compose down
```

---

## Local development (without Docker) — monolith

This is the default workflow; **no Docker required** for the backend/frontend.

### 1. Prerequisites

- Python 3.11
- Node.js 18+
- MySQL (local)
- Git

### 2. Database

Create the database and tables (same SQL as in `docker/mysql/init.sql` or use the block below), or run:

```bash
mysql -u root -p < docker/mysql/init.sql
# If your server has no yelp_prototype yet, add CREATE DATABASE first or use the README SQL block.
```

### 3. Backend

```bash
cd backend
python3.11 -m venv venv
source venv/bin/activate   # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env       # then edit .env
mkdir -p uploads/profile_pics uploads/restaurant_photos uploads/review_photos
uvicorn main:app --reload
```

API: [http://localhost:8000/docs](http://localhost:8000/docs)

### 4. Frontend

```bash
cd frontend
npm install
npm run dev
```

App: [http://localhost:5173](http://localhost:5173).  
The app uses `VITE_API_BASE` if set; otherwise it defaults to **`http://localhost:8000`** (the monolith).

### 5. Run each microservice on its own port (optional)

From `backend/`, with `PYTHONPATH` = current directory and `.env` configured (MySQL on `localhost`):

```bash
# terminal 1
uvicorn user_service.main:app --reload --port 8001
# terminal 2
uvicorn restaurant_service.main:app --reload --port 8002
# terminal 3
uvicorn review_service.main:app --reload --port 8003
# terminal 4
uvicorn owner_service.main:app --reload --port 8004
```

The stock React app expects a **single** API base URL (default `http://localhost:8000`). To use four ports you would need a reverse proxy (similar to the Docker `api_gateway`) or a matching `VITE_API_BASE` pointing at that proxy.

---

## MySQL schema (8 tables)

The canonical file for a **fresh** DB is `docker/mysql/init.sql`. For manual setup, the following matches the app (abbreviated; see file for full):

`users`, `user_preferences`, `restaurants`, `restaurant_photos`, `reviews`, `review_photos`, `favorites`, `chat_history`.

**Verify:** `SHOW TABLES;` in MySQL should list 8 tables.

---

## Checklist (local)

- [ ] MySQL running with `yelp_prototype` and 8 tables
- [ ] `backend/.env` with DB + `JWT_SECRET`
- [ ] Backend: `uvicorn main:app --reload` on port 8000
- [ ] Frontend: `npm run dev` on 5173
- [ ] Upload directories under `backend/uploads/...`

---

## Key features

**Core:** JWT auth, profile & preferences, restaurant search/CRUD, reviews & favorites, AI chat (Gemini + optional Tavily).

**Owner:** view tracking, claim workflow, owner dashboard.

---

## Repository layout (backend)

- `backend/main.py` — dev monolith (all routers, port 8000)
- `backend/user_service/`, `restaurant_service/`, `review_service/`, `owner_service/`
- `backend/shared/` — `database`, SQLAlchemy models, schemas, JWT, **`mongo.py`**
- `docker-compose.yml` — full stack
- `docker/mysql/init.sql` — MySQL schema
- `docker/nginx/gateway.conf` — routes `/` API paths to services

---

## License / credits

Yelp Prototype — coursework / portfolio project.
