"""Logging setup. Every log line carries a request id so you can follow one
request through the route, the service and any error."""

import logging
import os
from contextvars import ContextVar
from logging.handlers import RotatingFileHandler

import config

# Holds the id of the request currently being handled ("-" outside a request).
request_id_var: ContextVar[str] = ContextVar("request_id", default="-")


class RequestIdFilter(logging.Filter):
    def filter(self, record: logging.LogRecord) -> bool:
        record.request_id = request_id_var.get()
        return True


def setup_logging() -> None:
    fmt = logging.Formatter(
        "%(asctime)s | %(levelname)s | %(name)s | [%(request_id)s] %(message)s"
    )
    os.makedirs("logs", exist_ok=True)

    console = logging.StreamHandler()
    # Rotating file: at 5 MB it starts a new file and keeps 3 old ones, so logs
    # never fill the disk.
    file = RotatingFileHandler("logs/cutout.log", maxBytes=5_000_000, backupCount=3)

    for handler in (console, file):
        handler.setFormatter(fmt)
        handler.addFilter(RequestIdFilter())

    root = logging.getLogger()
    root.handlers = [console, file]
    root.setLevel(config.LOG_LEVEL)

    # These libraries log every HTTP call at INFO, which is noise.
    for noisy in ("httpx", "httpcore", "urllib3"):
        logging.getLogger(noisy).setLevel(logging.WARNING)
