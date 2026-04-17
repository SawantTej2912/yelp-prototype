import os
from aiokafka import AIOKafkaConsumer

KAFKA_BOOTSTRAP_SERVERS = os.getenv("KAFKA_BOOTSTRAP_SERVERS", "localhost:9092")

async def create_consumer():
    consumer = AIOKafkaConsumer(
        "user.created",
        "user.updated",
        bootstrap_servers=KAFKA_BOOTSTRAP_SERVERS,
        group_id="user-worker-group"
    )
    await consumer.start()
    return consumer
