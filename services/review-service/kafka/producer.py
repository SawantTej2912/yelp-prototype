import os
import json
from aiokafka import AIOKafkaProducer

KAFKA_BOOTSTRAP_SERVERS = os.getenv("KAFKA_BOOTSTRAP_SERVERS", "localhost:9092")

producer = None


async def get_producer():
    global producer
    if producer is None:
        producer = AIOKafkaProducer(
            bootstrap_servers=KAFKA_BOOTSTRAP_SERVERS
        )
        await producer.start()
    return producer


async def send_event(topic: str, payload: dict):
    kafka_producer = await get_producer()
    await kafka_producer.send_and_wait(
        topic,
        json.dumps(payload).encode("utf-8")
    )
