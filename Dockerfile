FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PORT=8000

WORKDIR /app

COPY pyproject.toml README.md ./
COPY app ./app
COPY assets ./assets
COPY data ./data
COPY manual ./manual
COPY vendor_libs ./vendor_libs
COPY run.py ./run.py
COPY MANUAL.md ./MANUAL.md
COPY DEVELOPER_DOCUMENTATION.md ./DEVELOPER_DOCUMENTATION.md
COPY RESUMO.md ./RESUMO.md

RUN python -m pip install --upgrade pip \
    && python -m pip install .

RUN mkdir -p /app/saves

EXPOSE 8000

CMD ["sh", "-c", "exec python -m uvicorn run:app --host 0.0.0.0 --port ${PORT}"]