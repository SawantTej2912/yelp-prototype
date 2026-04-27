#!/usr/bin/env bash
set -euo pipefail

echo "Applying namespace..."
kubectl apply -f k8s/namespace.yaml

echo "Applying shared config..."
kubectl apply -f k8s/configmap.yaml
kubectl apply -f k8s/secrets.yaml

echo "Applying databases..."
kubectl apply -f k8s/mysql/pvc.yaml
kubectl apply -f k8s/mysql/deployment.yaml
kubectl apply -f k8s/mysql/service.yaml
kubectl apply -f k8s/mongodb/pvc.yaml
kubectl apply -f k8s/mongodb/deployment.yaml
kubectl apply -f k8s/mongodb/service.yaml

echo "Applying zookeeper and kafka..."
kubectl apply -f k8s/zookeeper/deployment.yaml
kubectl apply -f k8s/zookeeper/service.yaml
kubectl apply -f k8s/kafka/deployment.yaml
kubectl apply -f k8s/kafka/service.yaml

echo "Applying backend services..."
kubectl apply -f k8s/user_service/deployment.yaml
kubectl apply -f k8s/user_service/service.yaml
kubectl apply -f k8s/restaurant_service/deployment.yaml
kubectl apply -f k8s/restaurant_service/service.yaml
kubectl apply -f k8s/review_service/deployment.yaml
kubectl apply -f k8s/review_service/service.yaml
kubectl apply -f k8s/owner_service/deployment.yaml
kubectl apply -f k8s/owner_service/service.yaml

echo "Applying workers..."
kubectl apply -f k8s/workers/review_worker_deployment.yaml
kubectl apply -f k8s/workers/restaurant_worker_deployment.yaml
kubectl apply -f k8s/workers/user_worker_deployment.yaml

echo "Applying gateway and frontend..."
kubectl apply -f k8s/gateway/configmap.yaml
kubectl apply -f k8s/gateway/deployment.yaml
kubectl apply -f k8s/gateway/service.yaml
kubectl apply -f k8s/frontend/deployment.yaml
kubectl apply -f k8s/frontend/service.yaml

echo "Done."
kubectl get svc -n yelp-prototype
