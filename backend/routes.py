"""The API layer: URLs, request parsing, response shapes. No business logic here;
it hands the work to services.py."""

import logging

from fastapi import APIRouter, File, Form, UploadFile
from pydantic import BaseModel

import config
import services

log = logging.getLogger("cutout.routes")
router = APIRouter(prefix="/api")


class RemoveResponse(BaseModel):
    image: str  # data URL of the cutout
    mask: str | None  # data URL of the mask, or null
    format: str


@router.get("/health")
def health():
    """Used by hosting platforms and uptime monitors to check the server is alive."""
    return {"status": "ok"}


@router.post("/remove", response_model=RemoveResponse)
def remove(
    file: UploadFile = File(...),
    model: str = Form(config.DEFAULT_MODEL),
    operating_resolution: str = Form(config.DEFAULT_RESOLUTION),
    output_format: str = Form(config.DEFAULT_FORMAT),
    refine_foreground: bool = Form(True),
    output_mask: bool = Form(False),
):
    """Remove the background from one image."""
    # Read at most limit+1 bytes: enough to detect "too big" without loading a huge upload.
    data = file.file.read(config.MAX_UPLOAD_BYTES + 1)
    log.info("Request to remove background: file=%r bytes=%d", file.filename, len(data))

    return services.remove_background(
        data=data,
        model=model,
        resolution=operating_resolution,
        output_format=output_format,
        refine_foreground=refine_foreground,
        output_mask=output_mask,
    )
