# Build from repository `backend/` directory:  docker build -f owner_service/Dockerfile .
FROM python:3.11-slim
WORKDIR /app
ENV PYTHONPATH=/app
ENV PYTHONDONTWRITEBYTECODE=1
COPY requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir -r /app/requirements.txt
COPY shared /app/shared
COPY owner_service /app/owner_service
EXPOSE 8004
CMD ["uvicorn", "owner_service.main:app", "--host", "0.0.0.0", "--port", "8004"]
