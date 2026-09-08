# Mock backend для локальной разработки фронтенда rag-graph.
# Не требует PostgreSQL / LiteLLM / LightRAG.
FROM debian:12-slim

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        python3 \
        python3-pip \
        python3-venv \
        ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Debian 12: pip в system Python запрещён (PEP 668) — ставим в venv
RUN python3 -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

COPY requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir -r /app/requirements.txt

COPY mock_main.py /app/mock_main.py

EXPOSE 8000

CMD ["uvicorn", "mock_main:app", "--host", "0.0.0.0", "--port", "8000"]
