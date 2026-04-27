"""Reusable Kafka producer with fail-safe publishing semantics.

Publishing failures are logged as warnings and never raise to callers, so
API requests are not impacted if Kafka is unavailable.
"""
from __future__ import annotations

import json
import logging
import os
from datetime import datetime, timezone
from typing import Any

from kafka import KafkaProducer

logger = logging.getLogger(__name__)

_producer: KafkaProducer | None = None
_producer_init_failed = False


def _get_bootstrap_servers() -> str:
    return os.getenv("KAFKA_BOOTSTRAP_SERVERS", "localhost:9092")


def _get_producer() -> KafkaProducer | None:
    global _producer, _producer_init_failed
    if _producer is not None:
        return _producer
    if _producer_init_failed:
        return None

    try:
        _producer = KafkaProducer(
            bootstrap_servers=_get_bootstrap_servers(),
            value_serializer=lambda v: json.dumps(v, default=str).encode("utf-8"),
            retries=3,
            acks="all",
            linger_ms=10,
        )
        return _producer
    except Exception as exc:
        _producer_init_failed = True
        logger.warning("Kafka producer unavailable; continuing without Kafka: %s", exc)
        return None


def publish_event(topic: str, payload: dict[str, Any]) -> None:
    producer = _get_producer()
    if producer is None:
        return

    event = {
        "topic": topic,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "payload": payload,
    }

    try:
        future = producer.send(topic, value=event)
        # Small timeout to avoid blocking request flow for long.
        future.get(timeout=2)
    except Exception as exc:
        logger.warning("Kafka publish failed for topic %s; continuing: %s", topic, exc)

