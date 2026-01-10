"""Logging configuration"""

import logging
import sys
from app.core.config import settings


def setup_logging() -> logging.Logger:
    """Configure application logging"""

    # Create logger
    logger = logging.getLogger("fitos-ai")
    logger.setLevel(getattr(logging, settings.LOG_LEVEL.upper()))

    # Console handler
    handler = logging.StreamHandler(sys.stdout)
    handler.setLevel(getattr(logging, settings.LOG_LEVEL.upper()))

    # Format
    formatter = logging.Formatter(
        "%(asctime)s - %(name)s - %(levelname)s - %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
    )
    handler.setFormatter(formatter)

    # Add handler
    logger.addHandler(handler)

    return logger
