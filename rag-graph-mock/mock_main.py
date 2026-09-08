"""
Mock backend для локальной разработки фронтенда.

Не требует PostgreSQL / LiteLLM / LightRAG.
Логин: любой непустой username + password.

Запуск (из каталога rag-backend, venv с зависимостями проекта):

    uvicorn mock_main:app --host 0.0.0.0 --port 8000 --reload

Vite proxy (localhost:5173 → :8000) продолжит работать как обычно.
"""

from __future__ import annotations

import asyncio
import json
import uuid
from datetime import datetime, timedelta, timezone
from typing import Any, Literal

from fastapi import FastAPI, HTTPException, Request, Response, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from jose import JWTError, jwt
from pydantic import BaseModel, Field

# ── Константы ────────────────────────────────────────────────────────────────

MOCK_SECRET = "mock-backend-dev-secret-not-for-production"
ALGORITHM = "HS256"
ACCESS_MINUTES = 60
REFRESH_DAYS = 7

MOCK_USER_ID = uuid.UUID("00000000-0000-4000-8000-000000000001")
NOW = datetime(2026, 9, 1, 12, 0, 0, tzinfo=timezone.utc)

SESSION_A = uuid.UUID("11111111-1111-4111-8111-111111111111")
SESSION_B = uuid.UUID("22222222-2222-4222-8222-222222222222")
SESSION_C = uuid.UUID("33333333-3333-4333-8333-333333333333")

MSG_A1 = uuid.UUID("aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1")
MSG_A2 = uuid.UUID("aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2")
MSG_B1 = uuid.UUID("bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1")
MSG_B2 = uuid.UUID("bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2")
MSG_B3 = uuid.UUID("bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb3")
MSG_C1 = uuid.UUID("cccccccc-cccc-4ccc-8ccc-ccccccccccc1")
MSG_C2 = uuid.UUID("cccccccc-cccc-4ccc-8ccc-ccccccccccc2")


# ── Schemas (минимальные, зеркалят фронтовые типы) ───────────────────────────

class LoginRequest(BaseModel):
    username: str
    password: str


class AccessTokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class MessageResponse(BaseModel):
    detail: str


class EffectivePermissions(BaseModel):
    models: list[str] | None = None
    tools: list[int] | None = None
    pipeline: bool = True
    graph: bool = True


class MeOut(BaseModel):
    id: uuid.UUID
    username: str
    email: str | None
    role: str
    is_active: bool
    created_at: datetime
    org_id: int | None = 1
    org_name: str | None = "Mock Org"
    permissions: EffectivePermissions = Field(
        default_factory=lambda: EffectivePermissions(models=None, tools=None)
    )


class SessionCreate(BaseModel):
    model: str
    title: str | None = None
    tool_id: int | None = None
    tool_enabled: bool = False


class SessionUpdate(BaseModel):
    title: str | None = None
    tool_enabled: bool | None = None


class SendMessageRequest(BaseModel):
    content: str


# ── JWT helpers ──────────────────────────────────────────────────────────────

def _now() -> datetime:
    return datetime.now(timezone.utc)


def create_token(subject: str, token_type: Literal["access", "refresh"]) -> str:
    if token_type == "access":
        expire = _now() + timedelta(minutes=ACCESS_MINUTES)
    else:
        expire = _now() + timedelta(days=REFRESH_DAYS)

    payload: dict[str, Any] = {
        "sub": subject,
        "type": token_type,
        "exp": expire,
        "iat": _now(),
    }
    if token_type == "refresh":
        payload["jti"] = str(uuid.uuid4())
    return jwt.encode(payload, MOCK_SECRET, algorithm=ALGORITHM)


def decode_token(token: str) -> dict[str, Any]:
    try:
        return jwt.decode(token, MOCK_SECRET, algorithms=[ALGORITHM])
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )


def set_refresh_cookie(response: Response, token: str) -> None:
    response.set_cookie(
        key="refresh_token",
        value=token,
        httponly=True,
        secure=False,
        samesite="Lax",
        path="/api/auth",
        max_age=REFRESH_DAYS * 86400,
    )


def clear_refresh_cookie(response: Response) -> None:
    response.delete_cookie(
        key="refresh_token",
        path="/api/auth",
        httponly=True,
        secure=False,
        samesite="Lax",
    )


def require_access(request: Request) -> str:
    auth = request.headers.get("Authorization", "")
    if not auth.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )
    payload = decode_token(auth[7:])
    if payload.get("type") != "access":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token type",
        )
    sub = payload.get("sub")
    if not sub:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has no subject",
        )
    return str(sub)


def me_for(username: str) -> MeOut:
    return MeOut(
        id=MOCK_USER_ID,
        username=username or "mock-user",
        email=f"{username or 'mock'}@mock.local",
        role="sysadmin",
        is_active=True,
        created_at=NOW,
    )


# ── In-memory store ──────────────────────────────────────────────────────────

# subject (username) → текущий логин (для /me)
_sessions_by_user: dict[str, str] = {}


def _seed_sessions() -> list[dict[str, Any]]:
    return [
        {
            "id": SESSION_A,
            "title": "Архитектура LightRAG",
            "model": "gpt-4o-mini",
            "tool_id": 1,
            "tool_enabled": True,
            "created_at": NOW - timedelta(days=2),
            "updated_at": NOW - timedelta(hours=5),
            "user_id": MOCK_USER_ID,
            "user_username": None,
            "user_org_id": 1,
            "user_org_name": "Mock Org",
            "last_message": "LightRAG строит граф знаний из документов…",
        },
        {
            "id": SESSION_B,
            "title": "Вопросы по пайплайну",
            "model": "claude-sonnet-4",
            "tool_id": None,
            "tool_enabled": False,
            "created_at": NOW - timedelta(days=1),
            "updated_at": NOW - timedelta(hours=2),
            "user_id": MOCK_USER_ID,
            "user_username": None,
            "user_org_id": 1,
            "user_org_name": "Mock Org",
            "last_message": "DAG запускается по расписанию или вручную.",
        },
        {
            "id": SESSION_C,
            "title": None,
            "model": "gpt-4o-mini",
            "tool_id": 1,
            "tool_enabled": False,
            "created_at": NOW - timedelta(hours=3),
            "updated_at": NOW - timedelta(hours=1),
            "user_id": MOCK_USER_ID,
            "user_username": None,
            "user_org_id": 1,
            "user_org_name": "Mock Org",
            "last_message": "Чем отличается entity extraction от clustering?",
        },
    ]


def _seed_messages() -> dict[uuid.UUID, list[dict[str, Any]]]:
    return {
        SESSION_A: [
            {
                "id": MSG_A1,
                "session_id": SESSION_A,
                "role": "user",
                "content": "Расскажи про архитектуру LightRAG",
                "rag_context": None,
                "created_at": NOW - timedelta(days=2, hours=1),
                "generation_duration": None,
            },
            {
                "id": MSG_A2,
                "session_id": SESSION_A,
                "role": "assistant",
                "content": (
                    "LightRAG строит граф знаний из документов: сначала "
                    "чанкование, затем извлечение сущностей и связей, "
                    "кластеризация и инъекция в графовое хранилище. "
                    "При запросе retrieval комбинирует векторный и графовый поиск."
                ),
                "rag_context": "chunk://docs/lightrag-overview.md#§2",
                "created_at": NOW - timedelta(days=2),
                "generation_duration": 1.42,
            },
        ],
        SESSION_B: [
            {
                "id": MSG_B1,
                "session_id": SESSION_B,
                "role": "user",
                "content": "Как запускается pipeline в Airflow?",
                "rag_context": None,
                "created_at": NOW - timedelta(days=1, hours=2),
                "generation_duration": None,
            },
            {
                "id": MSG_B2,
                "session_id": SESSION_B,
                "role": "assistant",
                "content": (
                    "DAG `build_graph_pipeline` запускается по расписанию "
                    "или вручную из админ-панели. На входе — пакет документов, "
                    "на выходе — обновлённый граф LightRAG."
                ),
                "rag_context": None,
                "created_at": NOW - timedelta(days=1, hours=1),
                "generation_duration": 0.88,
            },
            {
                "id": MSG_B3,
                "session_id": SESSION_B,
                "role": "user",
                "content": "А можно перезапустить только упавший шаг?",
                "rag_context": None,
                "created_at": NOW - timedelta(hours=2),
                "generation_duration": None,
            },
        ],
        SESSION_C: [
            {
                "id": MSG_C1,
                "session_id": SESSION_C,
                "role": "user",
                "content": "Чем отличается entity extraction от clustering?",
                "rag_context": None,
                "created_at": NOW - timedelta(hours=3),
                "generation_duration": None,
            },
            {
                "id": MSG_C2,
                "session_id": SESSION_C,
                "role": "assistant",
                "content": (
                    "Extraction достаёт сущности и отношения из текста чанка. "
                    "Clustering группирует похожие сущности, чтобы снизить "
                    "дубликаты в графе перед инъекцией."
                ),
                "rag_context": "chunk://pipeline/entity_clustering.py",
                "created_at": NOW - timedelta(hours=1),
                "generation_duration": 1.05,
            },
        ],
    }


MOCK_MODELS = [
    {"id": "gpt-4o-mini", "name": "gpt-4o-mini", "enabled": True},
    {"id": "gpt-4o", "name": "gpt-4o", "enabled": True},
    {"id": "claude-sonnet-4", "name": "claude-sonnet-4", "enabled": False},
    {"id": "qwen2.5-72b", "name": "qwen2.5-72b", "enabled": True},
]

MOCK_TOOLS = [
    {
        "id": 1,
        "name": "LightRAG Default",
        "description": "Моковая база знаний для UI-разработки",
        "tool_type": "lightrag",
        "is_active": True,
    },
    {
        "id": 2,
        "name": "Docs Archive",
        "description": "Вторая моковая БЗ",
        "tool_type": "lightrag",
        "is_active": True,
    },
]

sessions: list[dict[str, Any]] = _seed_sessions()
messages_by_session: dict[uuid.UUID, list[dict[str, Any]]] = _seed_messages()


def _find_session(session_id: uuid.UUID) -> dict[str, Any] | None:
    for s in sessions:
        if s["id"] == session_id:
            return s
    return None


def _session_out(s: dict[str, Any], *, with_preview: bool = False) -> dict[str, Any]:
    out = {
        "id": s["id"],
        "title": s["title"],
        "model": s["model"],
        "tool_id": s["tool_id"],
        "tool_enabled": s["tool_enabled"],
        "created_at": s["created_at"],
        "updated_at": s["updated_at"],
        "user_id": s["user_id"],
        "user_username": s.get("user_username"),
        "user_org_id": s.get("user_org_id"),
        "user_org_name": s.get("user_org_name"),
    }
    if with_preview:
        out["last_message"] = s.get("last_message")
    return out


# ── App ──────────────────────────────────────────────────────────────────────

app = FastAPI(
    title="RAG Graph API (mock)",
    version="0.1.0-mock",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:8000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Auth ─────────────────────────────────────────────────────────────────────

@app.post("/api/auth/login", response_model=AccessTokenResponse)
async def login(body: LoginRequest, response: Response) -> AccessTokenResponse:
    username = body.username.strip()
    password = body.password.strip()
    if not username or not password:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password",
        )

    # subject = username, чтобы /me мог вернуть введённый логин
    access = create_token(username, "access")
    refresh = create_token(username, "refresh")
    _sessions_by_user[username] = username
    set_refresh_cookie(response, refresh)
    return AccessTokenResponse(access_token=access)


@app.post("/api/auth/refresh", response_model=AccessTokenResponse)
async def refresh(request: Request, response: Response) -> AccessTokenResponse:
    refresh_token = request.cookies.get("refresh_token")
    if not refresh_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token missing",
        )
    payload = decode_token(refresh_token)
    if payload.get("type") != "refresh":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token type — expected refresh token",
        )
    username = str(payload.get("sub") or "")
    if not username:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token",
        )

    access = create_token(username, "access")
    new_refresh = create_token(username, "refresh")
    set_refresh_cookie(response, new_refresh)
    return AccessTokenResponse(access_token=access)


@app.post("/api/auth/logout", response_model=MessageResponse)
async def logout(response: Response) -> MessageResponse:
    clear_refresh_cookie(response)
    return MessageResponse(detail="Logged out")


@app.get("/api/auth/me", response_model=MeOut)
async def get_me(request: Request) -> MeOut:
    username = require_access(request)
    return me_for(username)


# ── Models / tools ───────────────────────────────────────────────────────────

@app.get("/api/models")
async def list_models(request: Request) -> list[dict[str, Any]]:
    require_access(request)
    return MOCK_MODELS


@app.get("/api/tools")
async def list_tools(request: Request) -> list[dict[str, Any]]:
    require_access(request)
    return MOCK_TOOLS


# ── Chat sessions ────────────────────────────────────────────────────────────

@app.get("/api/chat/sessions")
async def list_sessions(request: Request) -> list[dict[str, Any]]:
    require_access(request)
    # свежие сверху
    ordered = sorted(sessions, key=lambda s: s["updated_at"], reverse=True)
    return [_session_out(s, with_preview=True) for s in ordered]


@app.post("/api/chat/sessions", status_code=status.HTTP_201_CREATED)
async def create_session(body: SessionCreate, request: Request) -> dict[str, Any]:
    require_access(request)
    now = _now()
    session = {
        "id": uuid.uuid4(),
        "title": body.title,
        "model": body.model,
        "tool_id": body.tool_id,
        "tool_enabled": body.tool_enabled,
        "created_at": now,
        "updated_at": now,
        "user_id": MOCK_USER_ID,
        "user_username": None,
        "user_org_id": 1,
        "user_org_name": "Mock Org",
        "last_message": None,
    }
    sessions.insert(0, session)
    messages_by_session[session["id"]] = []
    return _session_out(session)


@app.get("/api/chat/sessions/{session_id}")
async def get_session(session_id: uuid.UUID, request: Request) -> dict[str, Any]:
    require_access(request)
    session = _find_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    return _session_out(session)


@app.patch("/api/chat/sessions/{session_id}")
async def update_session(
    session_id: uuid.UUID,
    body: SessionUpdate,
    request: Request,
) -> dict[str, Any]:
    require_access(request)
    session = _find_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    if body.title is not None:
        session["title"] = body.title
    if body.tool_enabled is not None:
        session["tool_enabled"] = body.tool_enabled
    session["updated_at"] = _now()
    return _session_out(session)


@app.delete(
    "/api/chat/sessions/{session_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    response_class=Response,
)
async def delete_session(session_id: uuid.UUID, request: Request) -> Response:
    require_access(request)
    session = _find_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    sessions.remove(session)
    messages_by_session.pop(session_id, None)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@app.get("/api/chat/sessions/{session_id}/messages")
async def get_messages(session_id: uuid.UUID, request: Request) -> list[dict[str, Any]]:
    require_access(request)
    if _find_session(session_id) is None:
        raise HTTPException(status_code=404, detail="Session not found")
    return messages_by_session.get(session_id, [])


@app.post("/api/chat/sessions/{session_id}/messages/stream")
async def stream_message(
    session_id: uuid.UUID,
    body: SendMessageRequest,
    request: Request,
) -> StreamingResponse:
    require_access(request)
    session = _find_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    now = _now()
    user_msg = {
        "id": uuid.uuid4(),
        "session_id": session_id,
        "role": "user",
        "content": body.content,
        "rag_context": None,
        "created_at": now,
        "generation_duration": None,
    }
    messages_by_session.setdefault(session_id, []).append(user_msg)

    if not session["title"]:
        session["title"] = body.content[:60]

    reply_text = (
        f"[mock] Получил: «{body.content[:200]}». "
        "Это ответ мокового бэкенда — LLM не вызывается."
    )
    assistant_id = uuid.uuid4()

    async def event_gen():
        # имитация rag_context
        rag = {
            "type": "rag_context",
            "content": "mock://knowledge/snippet-1",
        }
        yield f"data: {json.dumps(rag, ensure_ascii=False)}\n\n"
        await asyncio.sleep(0.05)

        for word in reply_text.split(" "):
            chunk = {"type": "chunk", "content": word + " "}
            yield f"data: {json.dumps(chunk, ensure_ascii=False)}\n\n"
            await asyncio.sleep(0.03)

        assistant_msg = {
            "id": assistant_id,
            "session_id": session_id,
            "role": "assistant",
            "content": reply_text,
            "rag_context": "mock://knowledge/snippet-1",
            "created_at": _now(),
            "generation_duration": 0.5,
        }
        messages_by_session[session_id].append(assistant_msg)
        session["last_message"] = reply_text[:120]
        session["updated_at"] = _now()

        done = {"type": "done", "message_id": str(assistant_id)}
        yield f"data: {json.dumps(done)}\n\n"

    return StreamingResponse(event_gen(), media_type="text/event-stream")


# ── Health ───────────────────────────────────────────────────────────────────

@app.get("/api/health", tags=["system"])
async def health():
    return {
        "status": "ok",
        "app": "rag-graph-mock",
        "env": "mock",
    }
