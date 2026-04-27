# Build from repository `backend/` directory:  docker build -f user_service/Dockerfile .
FROM python:3.11-slim
WORKDIR /app
ENV PYTHONPATH=/app
ENV PYTHONDONTWRITEBYTECODE=1
COPY requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir -r /app/requirements.txt
COPY shared /app/shared
COPY user_service /app/user_service
EXPOSE 8001
CMD ["uvicorn", "user_service.main:app", "--host", "0.0.0.0", "--port", "8001"]
