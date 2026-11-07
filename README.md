# Cutout

Batch background remover. React + Vite + TypeScript + Tailwind frontend, FastAPI backend calling fal-ai/birefnet/v2.
The backend holds the fal key so it never reaches the browser.

## Run it (two terminals)

Backend:

    cd backend
    pip install -r requirements.txt
    export FAL_KEY="your_key"        # PowerShell: $env:FAL_KEY="your_key"
    uvicorn main:app --reload --port 8000

Frontend:

    cd frontend
    npm install
    npm run dev

Open http://localhost:5173 (Vite proxies /api to port 8000).

## Backend layout

    main.py       app wiring: startup check, middleware, error handlers
    routes.py     the endpoints (URLs, request parsing, response shape)
    services.py   business logic: validation, calling fal, custom errors
    config.py     settings from env vars + constants
    logger.py     logging setup (console + rotating file, request ids)

## Endpoints

    GET  /api/health   -> {"status": "ok"}
    POST /api/remove   multipart form: file, model, operating_resolution,
                       output_format, refine_foreground, output_mask
                       -> {"image": dataURL, "mask": dataURL|null, "format": "png"}

Interactive docs: http://localhost:8000/docs

Every error has the same shape: {"detail": "...", "request_id": "..."}.

| Status | Meaning |
|--------|---------|
| 400 | Bad input (wrong file type, unknown option, bad combination) |
| 413 | File over 25 MB |
| 422 | Missing or malformed form field |
| 502 | fal failed or returned something unexpected |
| 504 | fal took too long |
| 500 | A bug on our side (details are in the log, not the response) |

## Environment variables

    FAL_KEY               required; the server refuses to start without it
    LOG_LEVEL             default INFO
    ALLOWED_ORIGINS       default http://localhost:5173 (comma-separated; for when the frontend is on another domain)
    FAL_TIMEOUT_SECONDS   default 120

Logs: terminal + backend/logs/cutout.log (rotates at 5 MB, keeps 3 old files).
Search a failing request by its id: grep 3f9a1c2b logs/cutout.log
