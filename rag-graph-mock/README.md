# rag-graph-mock

Mock backend для локальной разработки фронтенда [rag-graph](../rag-graph) без PostgreSQL / LiteLLM / LightRAG.

## Запуск

```bash
# 1. Освободите порт 8000 (если крутится systemd-бэкенд)
sudo systemctl stop rag-backend

# 2. Соберите и поднимите mock
docker compose up -d --build

# 3. В репозитории rag-graph запустите фронт
cd ~/devel/itc/rag-graph/rag-frontend && npm run dev
# http://localhost:5173 → proxy /api → :8000

# 4. После работы
docker compose down
sudo systemctl start rag-backend
```

Без Docker (из этой папки, с venv):

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn mock_main:app --host 0.0.0.0 --port 8000 --reload
```

## Поведение

- Логин: любой **непустой** username + password
- Моковые модели, сессии, сообщения и tools
- Стрим ответа — эхо без LLM

## Файлы

| Файл | Назначение |
|------|------------|
| `mock_main.py` | FastAPI mock-сервер |
| `requirements.txt` | Минимальные зависимости |
| `Dockerfile` | Образ на debian:12-slim |
| `compose.yaml` | Подъём на порту 8000 |
