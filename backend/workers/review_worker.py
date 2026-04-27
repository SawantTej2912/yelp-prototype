"""Consumes review Kafka events and persists event records in MongoDB."""
from __future__ import annotations

import logging
import os
import time
from datetime import datetime, timezone
from typing import Any

from kafka import KafkaConsumer

from shared.kafka_topics import (
    TOPIC_REVIEW_CREATED,
    TOPIC_REVIEW_DELETED,
    TOPIC_REVIEW_UPDATED,
)
from shared.mongo import get_mongo_db

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
logger = logging.getLogger("review_worker")


def _bootstrap_servers() -> str:
    return os.getenv("KAFKA_BOOTSTRAP_SERVERS", "localhost:9092")


def _create_consumer() -> KafkaConsumer:
    return KafkaConsumer(
        TOPIC_REVIEW_CREATED,
        TOPIC_REVIEW_UPDATED,
        TOPIC_REVIEW_DELETED,
        bootstrap_servers=_bootstrap_servers(),
        group_id="review_worker_group",
        enable_auto_commit=True,
        auto_offset_reset="earliest",
        value_deserializer=lambda b: __import__("json").loads(b.decode("utf-8")),
    )


def _store_event(event: dict[str, Any]) -> None:
    db = get_mongo_db()
    db["review_events"].insert_one(
        {
            "topic": event.get("topic"),
            "payload": event.get("payload"),
            "timestamp": event.get("timestamp") or datetime.now(timezone.utc).isoformat(),
            "status": "processed",
        }
    )


def main() -> None:
    logger.info("Starting review_worker, kafka=%s", _bootstrap_servers())
    while True:
        consumer: KafkaConsumer | None = None
        try:
            consumer = _create_consumer()
            for msg in consumer:
                event = msg.value
                _store_event(event)
                logger.info("Processed %s", event.get("topic"))
        except Exception as exc:
            logger.warning("review_worker error, retrying in 5s: %s", exc)
            time.sleep(5)
        finally:
            if consumer is not None:
                try:
                    consumer.close()
                except Exception:
                    pass


if __name__ == "__main__":
    main()

