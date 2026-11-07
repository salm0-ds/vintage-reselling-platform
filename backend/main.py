"""App wiring only: startup checks, middleware, error handlers, routes.

Run:  uvicorn main:app --reload --port 8000
"""

import logging
import time
import uuid
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

import config
from logger import request_id_var, setup_logging
from routes import router
from services import ServiceError

setup_logging()
log = logging.getLogger("cutout")


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Fail fast: a server that can't work should refuse to start, not fail on
    # the first user's request.
    if not config.FAL_KEY:
        raise RuntimeError("FAL_KEY environment variable is not set.")
    log.info("Cutout API started (log level %s)", config.LOG_LEVEL)
    yield
    log.info("Cutout API stopped")


app = FastAPI(title="Cutout API", lifespan=lifespan)


# ---------------------------------------------------------------- middleware
@app.middleware("http")
async def request_context(request: Request, call_next):
    """Give every request an id, time it, and log one line when it finishes."""
    request_id = uuid.uuid4().hex[:8]
    request_id_var.set(request_id)
    request.state.request_id = request_id

    started = time.perf_counter()
    try:
        response = await call_next(request)
    except Exception:
        # A bug. Log the full traceback, but never send internals to the client.
        # Handled here (not in an exception handler) so the response still gets
        # the request id header and CORS headers.
        log.exception("Unhandled error on %s %s", request.method, request.url.path)
        response = error_response(request, 500, "Something went wrong on the server.")
    log.info(
        "%s %s -> %d (%.0f ms)",
        request.method, request.url.path, response.status_code,
        (time.perf_counter() - started) * 1000,
    )
    response.headers["X-Request-ID"] = request_id
    return response


# Added last so it wraps everything else (CORS headers must be on every response).
app.add_middleware(
    CORSMiddleware,
    allow_origins=config.ALLOWED_ORIGINS,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
    expose_headers=["X-Request-ID"],
)


# ---------------------------------------------------------------- error handlers
# Every error leaves the API in the same shape: {"detail": "...", "request_id": "..."}
def error_response(request: Request, status: int, message: str) -> JSONResponse:
    request_id = getattr(request.state, "request_id", "-")
    return JSONResponse(
        status_code=status, content={"detail": message, "request_id": request_id}
    )


@app.exception_handler(ServiceError)
async def handle_service_error(request: Request, exc: ServiceError):
    # Expected failures. Bad input is a warning; upstream failures are errors.
    level = logging.WARNING if exc.status_code < 500 else logging.ERROR
    log.log(level, "%s: %s", type(exc).__name__, exc.message)
    return error_response(request, exc.status_code, exc.message)


@app.exception_handler(RequestValidationError)
async def handle_validation_error(request: Request, exc: RequestValidationError):
    # FastAPI's default 422 body is a nested list the frontend can't show.
    fields = ", ".join(str(e["loc"][-1]) for e in exc.errors())
    log.warning("Invalid request fields: %s", fields)
    return error_response(request, 422, f"Invalid or missing field: {fields}.")



app.include_router(router)
