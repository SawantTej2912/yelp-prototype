# Build from repository `backend/` directory:  docker build -f review_service/Dockerfile .
FROM python:3.11-slim
WORKDIR /app
ENV PYTHONPATH=/app
ENV PYTHONDONTWRITEBYTECODE=1
COPY requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir -r /app/requirements.txt
COPY shared /app/shared
COPY review_service /app/review_service
EXPOSE 8003
CMD ["uvicorn", "review_service.main:app", "--host", "0.0.0.0", "--port", "8003"]
