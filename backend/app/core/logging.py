import logging
import sys

logger = logging.getLogger("epharma")


def configure_logging() -> None:
    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(logging.Formatter("%(asctime)s %(levelname)s %(name)s: %(message)s"))

    root = logging.getLogger()
    root.setLevel(logging.INFO)
    root.handlers = [handler]
