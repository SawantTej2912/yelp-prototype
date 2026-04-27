# Kubernetes Deployment (Phase 5 Part 1)

This folder contains Kubernetes manifests for deploying the Yelp Prototype on AWS EKS.

## Prerequisites

- `kubectl` installed and configured
- `eksctl` installed
- AWS CLI installed and configured (`aws configure`)
- IAM permissions for EKS, ECR, EC2, and ELB resources

## 1) Create an EKS cluster

Example:

```bash
eksctl create cluster   --name yelp-prototype-eks   --region us-east-1   --nodes 3   --node-type t3.medium   --managed
```

Update kubeconfig if needed:

```bash
aws eks update-kubeconfig --region us-east-1 --name yelp-prototype-eks
```

## 2) Build and push images to ECR

Create repositories:

```bash
aws ecr create-repository --repository-name yelp-prototype/user_service --region us-east-1
aws ecr create-repository --repository-name yelp-prototype/restaurant_service --region us-east-1
aws ecr create-repository --repository-name yelp-prototype/review_service --region us-east-1
aws ecr create-repository --repository-name yelp-prototype/owner_service --region us-east-1
aws ecr create-repository --repository-name yelp-prototype/frontend --region us-east-1
aws ecr create-repository --repository-name yelp-prototype/review_worker --region us-east-1
aws ecr create-repository --repository-name yelp-prototype/restaurant_worker --region us-east-1
aws ecr create-repository --repository-name yelp-prototype/user_worker --region us-east-1
```

Authenticate Docker to ECR:

```bash
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin 451978385896.dkr.ecr.us-east-1.amazonaws.com
```

Build and push (example for one service):

```bash
docker build -t yelp-prototype/user_service:latest -f backend/user_service/Dockerfile backend
docker tag yelp-prototype/user_service:latest 451978385896.dkr.ecr.us-east-1.amazonaws.com/yelp-prototype/user_service:latest
docker push 451978385896.dkr.ecr.us-east-1.amazonaws.com/yelp-prototype/user_service:latest
```

Repeat for all services/workers/frontend.

## 3) Update placeholders

Before deployment, update `k8s/secrets.yaml` with real base64 values for:

- `DB_USER`, `DB_PASSWORD`
- `JWT_SECRET`, `GEMINI_API_KEY`, `TAVILY_API_KEY`, `YELP_API_KEY`

## 4) Deploy all resources

From project root:

```bash
chmod +x k8s/deploy.sh
./k8s/deploy.sh
```

## 5) Get external endpoints

Gateway and frontend are `LoadBalancer` services:

```bash
kubectl get svc -n yelp-prototype
```

Look for `EXTERNAL-IP` for:

- `api-gateway` (port 8000)
- `frontend` (port 5173)

You can also watch until an address is assigned:

```bash
kubectl get svc -n yelp-prototype -w
```
