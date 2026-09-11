# syntax=docker/dockerfile:1
FROM python:3.12-slim AS base

# psycopg[binary] ships prebuilt wheels, so no libpq-dev/gcc build toolchain is
# needed at image-build time -- keeps this a small, single-stage image.
WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

EXPOSE 8000

# Run pending Alembic migrations, then start the API. Migrations are safe to
# re-run on every container start -- Alembic no-ops once the DB is current.
CMD ["sh", "-c", "alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port 8000"]
