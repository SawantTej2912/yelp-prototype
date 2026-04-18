# Yelp Prototype – Lab 2 (Deployment, Kafka, MongoDB, Kubernetes)

## Overview

This project is an extension of the Lab 1 Yelp prototype.  
Lab 2 focuses on:

- Containerization using Docker  
- Orchestration using Kubernetes  
- Asynchronous messaging using Kafka  
- Migration from MySQL to MongoDB  

The system is designed using a **microservices architecture** with **producer-consumer patterns**.

---

## Architecture

### High-Level Design

```text
Frontend / Client
        |
        v
+----------------------+   +------------------------+   +------------------+
| User API Service     |   | Restaurant API Service |   | Review API       |
| (Producer)           |   | (Producer)             |   | (Producer)       |
+----------------------+   +------------------------+   +------------------+
         |                           |                            |
         v                           v                            v
-----------------------------------------------------------------------
|                            Kafka Topics                            |
| user.created        user.updated                                   |
| review.created      review.updated      review.deleted             |
| restaurant.created  restaurant.updated  restaurant.claimed         |
| booking.status                                                   |
-----------------------------------------------------------------------
         |                           |                            |
         v                           v                            v
+----------------------+   +------------------------+   +------------------+
| User Worker          |   | Restaurant Worker      |   | Review Worker    |
| (Consumer)           |   | (Consumer)             |   | (Consumer)       |
+----------------------+   +------------------------+   +------------------+
                     \          |           /
                      \         |          /
                       \________|_________/
                               |
                               v
                          +-------------+
                          |   MongoDB   |
                          +-------------+
```


---

## Technologies Used

- **Backend:** FastAPI (Python)
- **Database:** MongoDB
- **Messaging:** Apache Kafka
- **Containerization:** Docker
- **Orchestration:** Kubernetes
- **Async Processing:** Kafka producer-consumer pattern

---

## Part 1: Docker & Kubernetes

### Docker

Each service is containerized with its own Dockerfile:

- user-service  
- restaurant-service  
- review-service  
- user-worker  
- restaurant-worker  
- review-worker  

### Kubernetes

Deployed components:

- API services (user, restaurant, review)
- Worker services (Kafka consumers)
- Kafka + Zookeeper
- MongoDB

All services communicate within the cluster.

---

## Part 2: Kafka Integration

Kafka is used to process operations asynchronously.

### Topics Implemented

- `user.created`
- `user.updated`
- `review.created`
- `review.updated`
- `review.deleted`
- `restaurant.created`
- `restaurant.updated`
- `restaurant.claimed`
- `booking.status`

### Flow Example (Review)

1. User submits review → Review API publishes `review.created`
2. Review Worker consumes event
3. Review stored in MongoDB
4. Restaurant rating updated
5. Status published to `booking.status`

---

## Part 3: MongoDB Migration

All data from Lab 1 MySQL is migrated to MongoDB.

### Collections

- users  
- sessions  
- restaurants  
- reviews  
- favorites  
- restaurant_photos  
- activity_logs  
- booking_status  

### Security

- Passwords hashed using bcrypt  
- Sessions stored in MongoDB with expiry  

---

## Running the Project

### Prerequisites

- Docker Desktop (with Kubernetes enabled)
- kubectl
- MongoDB Compass (optional)

---

### Step 1: Build Docker Images
```bash
docker build -t yelp-user-service ./services/user-service
docker build -t yelp-restaurant-service ./services/restaurant-service
docker build -t yelp-review-service ./services/review-service
docker build -t yelp-user-worker ./services/user-worker
docker build -t yelp-restaurant-worker ./services/restaurant-worker
docker build -t yelp-review-worker ./services/review-worker
```

### Step 2: Deploy to Kubernetes
```bash
kubectl apply -f k8s/
```

### Step 3: Check Pods
```bash
kubectl get pods
```

### Step 4: Expose Services
```bash
kubectl get services
```

**Use NodePort to access APIs:**

`http://localhost:<nodeport>`

### Step 5: Test APIs

**Signup**
```bash
curl -X POST http://localhost:<user-port>/auth/signup \
-H "Content-Type: application/json" \
-d '{
  "name": "Test User",
  "email": "test@example.com",
  "password": "test123"
}'
```

**Create Review**
```bash
curl -X POST http://localhost:<review-port>/reviews/
```

**MongoDB Access**

**To view MongoDB inside Kubernetes:**
```bash
kubectl exec -it <mongodb-pod> -- mongosh
```

**Then:**
```bash
use yelp_lab2
db.users.find().pretty()
```
