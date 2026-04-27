# Build from repository `backend/` directory:  docker build -f restaurant_service/Dockerfile .
FROM python:3.11-slim
WORKDIR /app
ENV PYTHONPATH=/app
ENV PYTHONDONTWRITEBYTECODE=1
COPY requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir -r /app/requirements.txt
COPY shared /app/shared
COPY restaurant_service /app/restaurant_service
EXPOSE 8002
CMD ["uvicorn", "restaurant_service.main:app", "--host", "0.0.0.0", "--port", "8002"]
