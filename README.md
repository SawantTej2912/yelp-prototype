# Yelp Prototype

> A full-stack, microservices-based restaurant discovery and review platform — built for SJSU coursework and graded by professors and TAs.

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Tech Stack](#2-tech-stack)
3. [Architecture Overview](#3-architecture-overview)
4. [Local Development Setup (without Docker)](#4-local-development-setup-without-docker)
5. [Local Development Setup (with Docker)](#5-local-development-setup-with-docker)
6. [Environment Variables](#6-environment-variables)
7. [API Documentation](#7-api-documentation)
8. [Project Structure](#8-project-structure)
9. [Features](#9-features)
10. [Kubernetes Deployment (AWS EKS)](#10-kubernetes-deployment-aws-eks)
11. [JMeter Performance Testing](#11-jmeter-performance-testing)
12. [Git Workflow](#12-git-workflow)
13. [Contributors](#13-contributors)

---

## 1. Project Overview

**Yelp Prototype** is a production-grade restaurant discovery and review web application that replicates the core experience of Yelp. It allows:

- **Regular users** to register, explore restaurants, write/edit reviews, manage favorites, track their activity history, set dining preferences, and chat with an AI-powered assistant for personalized restaurant recommendations.
- **Restaurant owners** to claim their business listings, manage restaurant details, and access an analytics dashboard with review insights and view counts.

The backend is decomposed into independent **FastAPI microservices** (user, restaurant, review, owner) fronted by an **Nginx API gateway**, with **Kafka** handling asynchronous event streaming, **MySQL** for relational data, **MongoDB** for event persistence, and the full stack deployable on **AWS EKS** via Kubernetes.

---

## 2. Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 19, Vite 7, TailwindCSS 4, Redux Toolkit, React Router DOM 7, Axios |
| **Backend** | FastAPI, Python 3.11, Uvicorn, SQLAlchemy 2, PyMySQL, Pydantic v2 |
| **Relational DB** | MySQL 8.0 |
| **NoSQL DB** | MongoDB 7 (PyMongo) |
| **Message Broker** | Apache Kafka (Confluent 7.4), Zookeeper |
| **AI / LLM** | Google Gemini (`langchain-google-genai`), LangChain, LangGraph |
| **Web Search** | Tavily (`tavily-python`) |
| **Auth** | JWT (`python-jose`), bcrypt, Passlib |
| **Containerization** | Docker, Docker Compose |
| **Orchestration** | Kubernetes, AWS EKS, eksctl |
| **API Gateway** | Nginx 1.25 (Alpine) |
| **Testing** | Apache JMeter |

---

## 3. Architecture Overview

```
Browser (React/Vite — :5173)
        │
        ▼
┌─────────────────────────────┐
│   Nginx API Gateway (:8000) │  ← single public entry point
└──────────┬──────────────────┘
           │ routes by URL prefix
   ┌────────┼────────────────────────────┐
   ▼        ▼            ▼              ▼
user_svc  restaurant_svc  review_svc  owner_svc
(:8001)    (:8002)        (:8003)     (:8004)
   │            │              │           │
   └────────────┴──────────────┴───────────┘
                        │
              ┌──────────┴──────────┐
              ▼                     ▼
           MySQL 8            MongoDB 7
        (relational)         (event store)
              │
              ▼
       Kafka / Zookeeper
              │
   ┌──────────┼──────────┐
   ▼          ▼          ▼
review_    restaurant_  user_
worker     worker       worker
  (all write events to MongoDB review_events / restaurant_events / user_events)
```

### Nginx Routing Rules (`docker/nginx/gateway.conf`)

| URL Prefix | Upstream Service |
|---|---|
| `/auth`, `/users`, `/ai-assistant`, `/uploads` | `user_service:8001` |
| `/restaurants` | `restaurant_service:8002` |
| `/reviews`, `/favorites` | `review_service:8003` |
| `/owner`, `/restaurants/{id}/claim` | `owner_service:8004` |
| `/docs`, `/redoc`, `/openapi.json` | `user_service:8001` |

### Kafka Topics (`shared/kafka_topics.py`)

| Topic | Published By |
|---|---|
| `review.created`, `review.updated`, `review.deleted` | `review_service` |
| `restaurant.created`, `restaurant.updated`, `restaurant.claimed` | `restaurant_service` / `owner_service` |
| `user.created`, `user.updated` | `user_service` |

### Service Roles

| Service | Responsibility |
|---|---|
| `user_service` | Registration, login, JWT auth, profile management, preferences, AI chatbot |
| `restaurant_service` | Restaurant CRUD, search, photo uploads, view tracking |
| `review_service` | Reviews (create/edit/delete), star ratings, favorites |
| `owner_service` | Restaurant claiming, owner dashboard, analytics |
| `shared/` | SQLAlchemy DB connection, MongoDB client, Kafka producer, ORM models, Pydantic schemas |
| `workers/` | Kafka consumers — persist domain events to MongoDB asynchronously |

---

## 4. Local Development Setup (without Docker)

### Step 1 — Clone the repository

```bash
git clone <repository_url>
cd yelp-prototype
```

### Step 2 — Create MySQL database and all tables

Log into MySQL and run the following SQL:

```sql
SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

CREATE DATABASE IF NOT EXISTS yelp_prototype;
USE yelp_prototype;

-- Users
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('user', 'owner') DEFAULT 'user',
    profile_pic VARCHAR(255),
    phone VARCHAR(20),
    about_me TEXT,
    city VARCHAR(100),
    state VARCHAR(10),
    country VARCHAR(100),
    languages VARCHAR(255),
    gender VARCHAR(20),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- User preferences
CREATE TABLE user_preferences (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT UNIQUE NOT NULL,
    cuisine_prefs JSON,
    price_range VARCHAR(10),
    dietary_needs JSON,
    ambiance_prefs JSON,
    preferred_location VARCHAR(255),
    search_radius INT DEFAULT 10,
    sort_preference ENUM('rating','distance','popularity','price') DEFAULT 'rating',
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Restaurants
CREATE TABLE restaurants (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    cuisine_type VARCHAR(100),
    address VARCHAR(255),
    city VARCHAR(100),
    state VARCHAR(10),
    zip VARCHAR(20),
    description TEXT,
    contact_info VARCHAR(150),
    hours VARCHAR(255),
    pricing_tier ENUM('$','$$','$$$','$$$$'),
    amenities JSON,
    added_by INT,
    owner_id INT DEFAULT NULL,
    avg_rating DECIMAL(3,2) DEFAULT 0.00,
    review_count INT DEFAULT 0,
    view_count INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (added_by) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- Restaurant photos
CREATE TABLE restaurant_photos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    restaurant_id INT NOT NULL,
    photo_url VARCHAR(255) NOT NULL,
    uploaded_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE,
    FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- Reviews
CREATE TABLE reviews (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    restaurant_id INT NOT NULL,
    rating TINYINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
    comment TEXT,
    review_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Review photos
CREATE TABLE review_photos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    review_id INT NOT NULL,
    photo_url VARCHAR(255) NOT NULL,
    FOREIGN KEY (review_id) REFERENCES reviews(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Favorites
CREATE TABLE favorites (
    user_id INT NOT NULL,
    restaurant_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, restaurant_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Chat history
CREATE TABLE chat_history (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    role ENUM('user', 'assistant') NOT NULL,
    message TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

SET FOREIGN_KEY_CHECKS = 1;
```

### Step 3 — Set up Python virtual environment

```bash
cd backend
python3.11 -m venv venv
source venv/bin/activate          # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### Step 4 — Create the `.env` file

```bash
cp backend/.env.example backend/.env
# then edit backend/.env with real values (see Section 6)
```

### Step 5 — Create the uploads folder

```bash
mkdir -p backend/uploads
```

### Step 6 — Install frontend dependencies

```bash
cd frontend
npm install
```

### Step 7 — Run the backend

```bash
cd backend
source venv/bin/activate
uvicorn main:app --reload
# API available at http://localhost:8000
```

### Step 8 — Run the frontend

```bash
cd frontend
npm run dev
# App available at http://localhost:5173
```

> **Note:** In local dev mode, `main.py` acts as a monolith — all microservice routers are mounted on a single process. Kafka workers must be running separately if you need async event processing.

---

## 5. Local Development Setup (with Docker)

Docker Compose orchestrates every service: MySQL, MongoDB, Zookeeper, Kafka, all four microservices, the three Kafka workers, the Nginx gateway, and the React frontend.

### Start all services

```bash
docker compose up -d --build
```

| Service | Host URL |
|---|---|
| Frontend | http://localhost:5173 |
| API Gateway (Nginx) | http://localhost:8000 |
| user_service (direct) | http://localhost:8001 |
| restaurant_service (direct) | http://localhost:8002 |
| review_service (direct) | http://localhost:8003 |
| owner_service (direct) | http://localhost:8004 |
| MySQL | localhost:3307 |
| MongoDB | localhost:27017 |
| Kafka | localhost:9092 |

### Seed the database with sample restaurants

```bash
# Run from the backend/ directory with venv active
DB_HOST=localhost DB_PORT=3307 python seed_restaurants.py
```

### Stop all services

```bash
docker compose down
```

To also remove persistent volumes (database data):

```bash
docker compose down -v
```

---

## 6. Environment Variables

Create `backend/.env` (never commit this file — it is gitignored):

| Variable | Description | How to Obtain |
|---|---|---|
| `DB_HOST` | MySQL hostname | `localhost` locally; `mysql` in Docker |
| `DB_PORT` | MySQL port | `3306` locally; `3306` inside Docker network (host maps `3307→3306`) |
| `DB_USER` | MySQL username | Your local MySQL user (e.g. `root`) |
| `DB_PASSWORD` | MySQL password | Your local MySQL password |
| `DB_NAME` | MySQL database name | Use `yelp_prototype` |
| `MONGO_URI` | MongoDB connection string | `mongodb://localhost:27017/yelp_prototype` locally; `mongodb://mongodb:27017/yelp_prototype` in Docker |
| `KAFKA_BOOTSTRAP_SERVERS` | Kafka broker address | `localhost:9092` locally; `kafka:9092` in Docker |
| `JWT_SECRET` | Secret key for signing JWTs | Run: `python -c "import secrets; print(secrets.token_hex(32))"` |
| `JWT_ALGORITHM` | JWT signing algorithm | `HS256` |
| `JWT_EXPIRE_MINUTES` | JWT expiry in minutes | `1440` (24 hours) |
| `GEMINI_API_KEY` | Google Gemini API key | [Google AI Studio](https://aistudio.google.com/app/apikey) |
| `TAVILY_API_KEY` | Tavily search API key | [Tavily Dashboard](https://app.tavily.com) |

**Example `backend/.env`:**

```dotenv
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=yelp_prototype

MONGO_URI=mongodb://localhost:27017/yelp_prototype
KAFKA_BOOTSTRAP_SERVERS=localhost:9092

JWT_SECRET=your_generated_secret_here
JWT_ALGORITHM=HS256
JWT_EXPIRE_MINUTES=1440

GEMINI_API_KEY=your_gemini_key_here
TAVILY_API_KEY=your_tavily_key_here
```

---

## 7. API Documentation

FastAPI generates interactive Swagger UI automatically.

| Environment | Swagger URL |
|---|---|
| Local dev (monolith) | http://localhost:8000/docs |
| Docker (via gateway) | http://localhost:8000/docs |
| user_service direct | http://localhost:8001/docs |
| restaurant_service direct | http://localhost:8002/docs |
| review_service direct | http://localhost:8003/docs |
| owner_service direct | http://localhost:8004/docs |

The ReDoc alternative UI is also available at `/redoc` on any of the above hosts.

---

## 8. Project Structure

```
yelp-prototype/
│
├── backend/                          # All Python/FastAPI backend code
│   ├── main.py                       # Dev monolith — mounts all service routers on :8000
│   ├── requirements.txt              # All Python dependencies
│   ├── seed_restaurants.py           # Script to populate sample restaurant data
│   ├── session_restaurants_data.json # Raw restaurant data used by the seeder
│   │
│   ├── user_service/                 # Auth, profiles, preferences, AI chatbot
│   │   ├── Dockerfile
│   │   ├── main.py                   # Standalone entrypoint (:8001)
│   │   └── routers/
│   │       ├── auth.py               # /auth — register, login, JWT issue
│   │       ├── users.py              # /users — profile CRUD, preferences
│   │       └── ai_assistant.py       # /ai-assistant — Gemini + LangChain chatbot
│   │
│   ├── restaurant_service/           # Restaurant listings and search
│   │   ├── Dockerfile
│   │   ├── main.py                   # Standalone entrypoint (:8002)
│   │   └── routers/
│   │       └── restaurants.py        # /restaurants — CRUD, search, photos, view tracking
│   │
│   ├── review_service/               # Reviews and favorites
│   │   ├── Dockerfile
│   │   ├── main.py                   # Standalone entrypoint (:8003)
│   │   └── routers/
│   │       └── reviews.py            # /reviews, /favorites — ratings, CRUD, bookmarks
│   │
│   ├── owner_service/                # Owner dashboard and restaurant claiming
│   │   ├── Dockerfile
│   │   ├── main.py                   # Standalone entrypoint (:8004)
│   │   └── routers/
│   │       └── owner.py              # /owner/*, /restaurants/{id}/claim
│   │
│   ├── shared/                       # Cross-service utilities and ORM models
│   │   ├── database.py               # SQLAlchemy engine and session factory
│   │   ├── mongo.py                  # PyMongo client and db accessor
│   │   ├── kafka_producer.py         # Shared Kafka producer (publishes domain events)
│   │   ├── kafka_topics.py           # Kafka topic name constants
│   │   ├── models/                   # SQLAlchemy ORM table definitions
│   │   │   ├── user.py
│   │   │   ├── restaurant.py
│   │   │   ├── review.py
│   │   │   ├── favorite.py
│   │   │   ├── chat_history.py
│   │   │   └── user_preferences.py
│   │   ├── schemas/                  # Pydantic request/response schemas
│   │   └── utils/                    # Auth helpers (JWT, password hashing)
│   │
│   ├── workers/                      # Kafka consumer workers (async event processing)
│   │   ├── Dockerfile
│   │   ├── review_worker.py          # Consumes review.* topics → MongoDB
│   │   ├── restaurant_worker.py      # Consumes restaurant.* topics → MongoDB
│   │   └── user_worker.py            # Consumes user.* topics → MongoDB
│   │
│   └── uploads/                      # Static file storage for uploaded images
│
├── frontend/                         # React + Vite frontend application
│   ├── index.html
│   ├── vite.config.js
│   ├── package.json
│   ├── Dockerfile
│   ├── nginx.conf                    # Nginx config for serving the built React app
│   └── src/
│       ├── main.jsx                  # React entry point, Redux Provider
│       ├── App.jsx                   # React Router route definitions
│       ├── index.css / App.css       # Global styles (TailwindCSS)
│       ├── config.js                 # API base URL configuration
│       ├── api/                      # Axios API client modules
│       │   ├── axios.js              # Axios instance with JWT interceptor
│       │   ├── users.js
│       │   ├── restaurants.js
│       │   ├── reviews.js
│       │   └── aiAssistant.js
│       ├── store/                    # Redux Toolkit store
│       │   ├── index.js              # configureStore
│       │   └── slices/
│       │       ├── authSlice.js      # User auth state
│       │       ├── restaurantSlice.js
│       │       ├── reviewSlice.js
│       │       └── favoritesSlice.js
│       ├── components/               # Shared UI components
│       │   ├── Navbar.jsx
│       │   ├── ChatWidget.jsx        # Floating AI assistant bubble
│       │   ├── RestaurantCard.jsx
│       │   └── ProtectedRoute.jsx
│       └── pages/                    # Full page components (one per route)
│           ├── LoginPage.jsx
│           ├── SignupPage.jsx
│           ├── ExplorePage.jsx
│           ├── RestaurantDetailsPage.jsx
│           ├── AddRestaurantPage.jsx
│           ├── WriteReviewPage.jsx
│           ├── ProfilePage.jsx
│           ├── PreferencesPage.jsx
│           ├── FavoritesPage.jsx
│           ├── HistoryPage.jsx
│           └── OwnerDashboardPage.jsx
│
├── docker/                           # Docker build support files
│   ├── mysql/
│   │   └── init.sql                  # Auto-applied schema on first MySQL container start
│   └── nginx/
│       └── gateway.conf              # Nginx reverse-proxy routing rules
│
├── k8s/                              # Kubernetes manifests (AWS EKS deployment)
│   ├── namespace.yaml
│   ├── configmap.yaml
│   ├── secrets.yaml
│   ├── deploy.sh                     # One-shot deploy script (kubectl apply)
│   ├── mysql/                        # MySQL PVC, Deployment, Service
│   ├── mongodb/                      # MongoDB PVC, Deployment, Service
│   ├── zookeeper/
│   ├── kafka/
│   ├── user_service/
│   ├── restaurant_service/
│   ├── review_service/
│   ├── owner_service/
│   ├── workers/                      # Worker Deployment YAMLs
│   ├── gateway/                      # Nginx gateway ConfigMap, Deployment, Service
│   └── frontend/
│
├── jmeter/                           # Apache JMeter performance tests
│   ├── yelp_performance_test.jmx     # JMeter test plan
│   └── results.jtl                   # Previous test results
│
├── docker-compose.yml                # Full stack Docker Compose definition
├── local_dump.sql                    # Full MySQL dump for quick data restore
└── README.md
```

---

## 9. Features

| Feature | Details |
|---|---|
| **Authentication** | JWT-based register/login with bcrypt password hashing; `role` field distinguishes `user` from `owner` |
| **User Profile** | View and edit name, avatar, phone, bio, city, state, country, languages, gender |
| **Dining Preferences** | Set cuisine preferences, dietary restrictions, price range, ambiance, preferred location, search radius, and sort order |
| **Restaurant CRUD** | Add, edit, delete restaurants with address, hours, cuisine type, pricing tier, amenities, and multi-photo upload |
| **Restaurant Search & Explore** | Filter by cuisine, price, city, rating; sort by rating, distance, or popularity; view-count tracking |
| **Reviews** | Create, update, delete 1–5 star reviews with text and photo attachments; restaurant `avg_rating` and `review_count` are updated automatically |
| **Favorites** | Bookmark restaurants; view and manage your favourites list |
| **Activity History** | Browse your interaction and review history over time |
| **AI Chatbot** | Floating `ChatWidget` powered by Google Gemini via LangChain; uses Tavily for real-time web search to give contextual restaurant recommendations; persists conversation in MySQL `chat_history` |
| **Owner Dashboard** | Restaurant owners can claim listings, view per-restaurant analytics (total reviews, average rating, view count), and manage business details |
| **Kafka Async Messaging** | Every create/update/delete action in review, restaurant, and user services publishes a domain event to Kafka; three dedicated worker processes consume those events and persist them to MongoDB as an audit/event log |
| **Redux State Management** | `authSlice`, `restaurantSlice`, `reviewSlice`, and `favoritesSlice` manage global frontend state via Redux Toolkit |
| **Role-Based Access Control** | `ProtectedRoute` component guards all authenticated pages; owner-only routes verified server-side |

---

## 10. Kubernetes Deployment (AWS EKS)

All Kubernetes manifests live in the `k8s/` directory. A single shell script applies them in the correct dependency order.

### Prerequisites

- AWS CLI configured (`aws configure`)
- `eksctl` installed
- `kubectl` installed and configured

### Step 1 — Create an EKS cluster

```bash
eksctl create cluster \
  --name yelp-prototype-eks \
  --region us-east-1 \
  --nodes 3 \
  --node-type t3.medium \
  --managed

aws eks update-kubeconfig --region us-east-1 --name yelp-prototype-eks
```

### Step 2 — Build and push images to Amazon ECR

```bash
# Create ECR repositories (one per service)
aws ecr create-repository --repository-name yelp-prototype/user_service --region us-east-1
aws ecr create-repository --repository-name yelp-prototype/restaurant_service --region us-east-1
aws ecr create-repository --repository-name yelp-prototype/review_service --region us-east-1
aws ecr create-repository --repository-name yelp-prototype/owner_service --region us-east-1
aws ecr create-repository --repository-name yelp-prototype/frontend --region us-east-1
aws ecr create-repository --repository-name yelp-prototype/review_worker --region us-east-1
aws ecr create-repository --repository-name yelp-prototype/restaurant_worker --region us-east-1
aws ecr create-repository --repository-name yelp-prototype/user_worker --region us-east-1

# Authenticate Docker to ECR
aws ecr get-login-password --region us-east-1 \
  | docker login --username AWS --password-stdin \
    <YOUR_AWS_ACCOUNT_ID>.dkr.ecr.us-east-1.amazonaws.com

# Build and push each image (example for user_service)
docker build -t yelp-prototype/user_service:latest -f backend/user_service/Dockerfile backend
docker tag yelp-prototype/user_service:latest \
  <YOUR_AWS_ACCOUNT_ID>.dkr.ecr.us-east-1.amazonaws.com/yelp-prototype/user_service:latest
docker push \
  <YOUR_AWS_ACCOUNT_ID>.dkr.ecr.us-east-1.amazonaws.com/yelp-prototype/user_service:latest
```

Repeat for all services, workers, and the frontend.

### Step 3 — Configure secrets

Update `k8s/secrets.yaml` with real base64-encoded values:

```bash
echo -n "your_value" | base64
```

Populate: `DB_USER`, `DB_PASSWORD`, `JWT_SECRET`, `GEMINI_API_KEY`, `TAVILY_API_KEY`.

### Step 4 — Deploy everything

```bash
chmod +x k8s/deploy.sh
./k8s/deploy.sh
```

The script applies resources in this order: namespace → configmaps/secrets → databases → Zookeeper/Kafka → microservices → workers → gateway → frontend.

### Step 5 — Get external endpoints

```bash
kubectl get svc -n yelp-prototype
# Look for EXTERNAL-IP on api-gateway (:8000) and frontend (:5173)
```

---

## 11. JMeter Performance Testing

The JMeter test plan is located at `jmeter/yelp_performance_test.jmx`.

### Running the test plan (GUI mode)

1. Open **Apache JMeter** (download from [jmeter.apache.org](https://jmeter.apache.org/)).
2. Go to **File → Open** and select `jmeter/yelp_performance_test.jmx`.
3. Update the **HTTP Request Defaults** element if your host/port differs from `localhost:8000`.
4. Click the **green Play button** to run.
5. Results appear in the configured listeners (e.g., Summary Report, View Results Tree).

### Running the test plan (CLI / headless mode)

```bash
jmeter -n \
  -t jmeter/yelp_performance_test.jmx \
  -l jmeter/results_$(date +%Y%m%d_%H%M%S).jtl \
  -e -o jmeter/html_report
```

Previous results are saved in `jmeter/results.jtl` and an HTML report is in `jmeter/html_report/`.

---

## 12. Git Workflow

### Branch Naming

| Type | Convention | Example |
|---|---|---|
| Feature | `feature/<short-description>` | `feature/owner-dashboard` |
| Bug fix | `bugfix/<short-description>` | `bugfix/login-network-error` |
| Hotfix | `hotfix/<short-description>` | `hotfix/jwt-expiry` |
| Release | `release/<version>` | `release/1.0.0` |

### Daily Workflow

```bash
# 1. Sync with main before starting work
git checkout main
git pull origin main

# 2. Create a feature branch
git checkout -b feature/your-feature-name

# 3. Commit regularly with meaningful messages
git add .
git commit -m "feat(owner): add restaurant claim endpoint"

# 4. Push to remote
git push origin feature/your-feature-name

# 5. Open a Pull Request on GitHub targeting main
```

### Commit Message Convention

Use the format `type(scope): description`, e.g.:
- `feat(user): add profile photo upload`
- `fix(review): correct avg_rating calculation on delete`
- `docs: update README with Docker setup`
- `chore: upgrade langchain to 1.2.10`

### PR Process

1. Open a Pull Request from your feature branch → `main`.
2. Add a description explaining what changed and why.
3. Ensure there are no merge conflicts.
4. Request a code review if working in a team.
5. Merge via **Squash and Merge** to keep `main` history clean.

---

## 13. Contributors

| Name | Role |
|---|---|
| **Tejas Sawant** | Full-stack developer — architecture, backend microservices, frontend, DevOps, AI integration |
| **Shashira** | Full-stack developer — architecture, backend microservices, frontend, DevOps, AI integration |

---

*Built for SJSU — Spring 2026*
