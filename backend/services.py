"""Business logic: validate the input, talk to fal, return the result.
Knows nothing about HTTP. It raises ServiceError subclasses and the API layer
decides how those become responses."""

import base64
import logging
import time

import fal_client
import httpx
import requests

import config

log = logging.getLogger("cutout.services")


# ---------------------------------------------------------------- errors
class ServiceError(Exception):
    """Something we expected could go wrong. `message` is safe to show the user."""

    status_code = 500

    def __init__(self, message: str):
        super().__init__(message)
        self.message = message


class InvalidInputError(ServiceError):
    status_code = 400  # the request itself is wrong


class FileTooLargeError(ServiceError):
    status_code = 413


class UpstreamError(ServiceError):
    status_code = 502  # fal (or the download from fal) failed


class UpstreamTimeoutError(ServiceError):
    status_code = 504  # fal took too long


# ---------------------------------------------------------------- helpers
def detect_image_type(data: bytes) -> str | None:
    """Identify the image from its first bytes. The browser-supplied content type
    can be wrong or faked, so we don't trust it."""
    if data.startswith(b"\xff\xd8\xff"):
        return "image/jpeg"
    if data.startswith(b"\x89PNG\r\n\x1a\n"):
        return "image/png"
    if data[:4] == b"RIFF" and data[8:12] == b"WEBP":
        return "image/webp"
    return None


def validate_options(model: str, resolution: str, output_format: str) -> None:
    if model not in config.MODELS:
        raise InvalidInputError(f"Unknown model: {model!r}.")
    if resolution not in config.RESOLUTIONS:
        raise InvalidInputError(f"Unknown resolution: {resolution!r}.")
    if output_format not in config.FORMATS:
        raise InvalidInputError(f"Unknown output format: {output_format!r}.")
    if resolution == "2304x2304" and model != "General Use (Dynamic)":
        raise InvalidInputError(
            "2304x2304 only works with the General Use (Dynamic) model."
        )


def _to_data_url(url: str, mime: str) -> str:
    """Download a fal-hosted file and inline it as a base64 data URL."""
    try:
        resp = requests.get(url, timeout=60)
        resp.raise_for_status()
    except requests.RequestException as e:
        log.exception("Downloading result failed")
        raise UpstreamError("Couldn't download the processed image. Try again.") from e
    return f"data:{mime};base64,{base64.b64encode(resp.content).decode()}"


# ---------------------------------------------------------------- main function
def remove_background(
    data: bytes,
    model: str,
    resolution: str,
    output_format: str,
    refine_foreground: bool,
    output_mask: bool,
) -> dict:
    # 1. Validate everything before spending an API call.
    validate_options(model, resolution, output_format)
    if not data:
        raise InvalidInputError("The uploaded file is empty.")
    if len(data) > config.MAX_UPLOAD_BYTES:
        raise FileTooLargeError("Image is larger than 25 MB.")
    mime = detect_image_type(data)
    if mime is None:
        raise InvalidInputError("Only JPG, PNG or WebP images are supported.")

    # 2. Call fal. Real error details go to the log; the user gets a safe message.
    started = time.perf_counter()
    try:
        image_url = fal_client.upload(data, mime)
        result = fal_client.subscribe(
            config.FAL_ENDPOINT,
            arguments={
                "image_url": image_url,
                "model": model,
                "operating_resolution": resolution,
                "output_format": output_format,
                "refine_foreground": refine_foreground,
                "output_mask": output_mask,
            },
            client_timeout=config.FAL_TIMEOUT_SECONDS,
        )
    except (httpx.TimeoutException, TimeoutError) as e:
        log.exception("fal request timed out")
        raise UpstreamTimeoutError("Background removal took too long. Try again.") from e
    except Exception as e:  # fal can raise many different things; treat all as upstream
        log.exception("fal request failed")
        raise UpstreamError("The background removal service failed. Try again.") from e

    # 3. Read the response defensively; don't assume fal's shape.
    try:
        image = _to_data_url(result["image"]["url"], config.FORMATS[output_format])
    except (KeyError, TypeError) as e:
        log.error("Unexpected fal response shape: %r", result)
        raise UpstreamError("Unexpected response from the background removal service.") from e

    # Field name per fal's schema; .get() so a missing field can't crash the request.
    mask = None
    mask_info = result.get("mask_image")
    if output_mask and isinstance(mask_info, dict) and mask_info.get("url"):
        mask = _to_data_url(mask_info["url"], "image/png")

    log.info(
        "Removed background: model=%s res=%s fmt=%s size=%dKB took=%.1fs",
        model, resolution, output_format, len(data) // 1024,
        time.perf_counter() - started,
    )
    return {"image": image, "mask": mask, "format": output_format}
