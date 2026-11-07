"""All settings and constants in one place. Anything that differs between your
laptop and a server comes from an environment variable."""

import os

# --- environment (change per deployment) ---
FAL_KEY = os.getenv("FAL_KEY")  # read by fal_client itself; we only check it exists at startup
LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO").upper()
# Browsers allowed to call this API from a different origin (comma-separated).
ALLOWED_ORIGINS = [
    o.strip() for o in os.getenv("ALLOWED_ORIGINS", "http://localhost:5173").split(",")
]
FAL_TIMEOUT_SECONDS = float(os.getenv("FAL_TIMEOUT_SECONDS", "120"))

# --- fixed values (change only when fal or your requirements change) ---
FAL_ENDPOINT = "fal-ai/birefnet/v2"
MAX_UPLOAD_BYTES = 25 * 1024 * 1024

MODELS = {
    "General Use (Light)", "General Use (Light 2K)", "General Use (Heavy)",
    "Matting", "Portrait", "General Use (Dynamic)",
}
RESOLUTIONS = {"1024x1024", "2048x2048", "2304x2304"}
FORMATS = {"png": "image/png", "webp": "image/webp", "gif": "image/gif"}

DEFAULT_MODEL = "General Use (Light)"
DEFAULT_RESOLUTION = "1024x1024"
DEFAULT_FORMAT = "png"
