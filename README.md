# Yelp Prototype

A Yelp-style restaurant discovery and review platform built with FastAPI + React.

## Tech Stack
- Backend: Python 3.11 + FastAPI
- Frontend: React + Vite + TailwindCSS
- Database: MySQL
- Auth: JWT

## Setup Instructions


## Step 1 — Prerequisites
Make sure these are installed:
- Python 3.11
- Node.js (v18+)
- MySQL
- Git

---

## Step 2 — Clone the Repo
```bash
git clone https://github.com/SawantTej2912/yelp-prototype.git
cd yelp-prototype
```

---

## Step 3 — Set Up the Database

**Start MySQL and log in:**
```bash
mysql -u root -p
```

**Run this to create the database and all tables:**
```sql
CREATE DATABASE yelp_prototype;
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
);

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
    sort_preference ENUM('rating', 'distance', 'popularity', 'price') DEFAULT 'rating',
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

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
    pricing_tier ENUM('$', '$$', '$$$', '$$$$'),
    amenities JSON,
    added_by INT,
    owner_id INT DEFAULT NULL,
    avg_rating DECIMAL(3,2) DEFAULT 0.00,
    review_count INT DEFAULT 0,
    view_count INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (added_by) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Restaurant photos
CREATE TABLE restaurant_photos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    restaurant_id INT NOT NULL,
    photo_url VARCHAR(255) NOT NULL,
    uploaded_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE,
    FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE SET NULL
);

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
);

-- Review photos
CREATE TABLE review_photos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    review_id INT NOT NULL,
    photo_url VARCHAR(255) NOT NULL,
    FOREIGN KEY (review_id) REFERENCES reviews(id) ON DELETE CASCADE
);

-- Favorites
CREATE TABLE favorites (
    user_id INT NOT NULL,
    restaurant_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, restaurant_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE
);

-- Chat history
CREATE TABLE chat_history (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    role ENUM('user', 'assistant') NOT NULL,
    message TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

**Verify:**
```sql
SHOW TABLES;
```
Should show 8 tables. ✅

---

## Step 4 — Set Up the Backend

```bash
cd backend
python3.11 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

**Create the `.env` file:**
```bash
touch .env
```

Add this inside — replacing with their own MySQL password and generating their own JWT secret:
```env
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=their_mysql_password
DB_NAME=yelp_prototype

JWT_SECRET=run_this_to_generate: python3 -c "import secrets; print(secrets.token_hex(32))"
JWT_ALGORITHM=HS256
JWT_EXPIRE_MINUTES=1440

GEMINI_API_KEY=their_gemini_key
```

**Generate their JWT secret:**
```bash
python3 -c "import secrets; print(secrets.token_hex(32))"
```
Copy the output into `JWT_SECRET=`

**Run the backend:**
```bash
uvicorn main:app --reload
```

Visit `http://localhost:8000/docs` to confirm it's running ✅

---

## Step 5 — Set Up the Frontend

Open a new terminal tab:

```bash
cd frontend
npm install
npm run dev
```

Visit `http://localhost:5173` ✅

---

## Step 6 — Create Uploads Folder

The backend needs this folder to store photos:

```bash
cd backend
mkdir -p uploads/restaurants uploads/reviews uploads/profiles
```

---

## ✅ Full Checklist for Groupmate

- [ ] MySQL running with `yelp_prototype` database and all 8 tables
- [ ] `backend/.env` created with their own DB password and JWT secret
- [ ] Backend running at `localhost:8000`
- [ ] Frontend running at `localhost:5173`
- [ ] `uploads/` folder created inside backend

---

## 🚀 Key Features Implemented

**Core Features:**
- Full User Auth (JWT setup, bcrypt hashes)
- Profile & Preferences Management (Syncs with AI Assistant)
- Dynamic Restaurant Search / Details / Add / Favorites
- Review System (Add, Edit, Delete with Star Ratings)
- Conversational AI Chatbot (Gemini + Tavily Web Search)

**Owner Specific Stretch Features:**
- **Tracking Restaurant Views:** Silent backend tracker augmenting the `view_count`.
- **Claim Restaurant Workflow:** Validates whether a restaurant operates under an owner; allows any user to claim it which immediately upgrades their session access level.
- **Owner Dashboard:** A dedicated space for verified `'owner'` roles incorporating full Review filtering and graphical Restaurant progression stats/analytics (View Counts, Rating Distributions, Total Reviews).
