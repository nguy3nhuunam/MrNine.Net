"""MrNine SDK — Python client cho API gateway https://api.mrnine.net.

OpenAI-compatible. Sync + async + streaming.

Example::

    from mrnine import MrNine

    client = MrNine(api_key="sk-mrnine-...")
    r = client.chat.completions.create(
        model="gpt-5.4",
        messages=[{"role": "user", "content": "hi"}],
    )
    print(r["choices"][0]["message"]["content"])

    # Stream
    for chunk in client.chat.completions.stream(
        model="gpt-5.4",
        messages=[{"role": "user", "content": "đếm 1 đến 5"}],
    ):
        print(chunk["choices"][0]["delta"].get("content", ""), end="", flush=True)

    # Async
    import asyncio
    from mrnine import AsyncMrNine

    async def main():
        async with AsyncMrNine(api_key="sk-mrnine-...") as c:
            r = await c.chat.completions.create(
                model="gpt-5.4",
                messages=[{"role": "user", "content": "hi"}],
            )
            print(r["choices"][0]["message"]["content"])

    asyncio.run(main())
"""

from __future__ import annotations

import json
from typing import Any, AsyncIterator, Iterator, Mapping, Optional

import httpx

__version__ = "0.1.0"
__all__ = ["MrNine", "AsyncMrNine", "MrNineError"]


class MrNineError(Exception):
    def __init__(self, status: int, message: str, type: Optional[str] = None, code: Optional[str] = None):
        super().__init__(message)
        self.status = status
        self.type = type
        self.code = code


def _parse_error(res: httpx.Response) -> MrNineError:
    try:
        body = res.json()
        err = body.get("error") if isinstance(body, dict) else None
        if isinstance(err, dict):
            return MrNineError(
                status=res.status_code,
                message=str(err.get("message", f"HTTP {res.status_code}")),
                type=err.get("type"),
                code=err.get("code"),
            )
    except Exception:  # noqa: BLE001
        pass
    return MrNineError(status=res.status_code, message=f"HTTP {res.status_code}: {res.text[:200]}")


# ──────────────────────────────────────────────────────────────────
# Sync client
# ──────────────────────────────────────────────────────────────────
class _ChatCompletions:
    def __init__(self, client: "MrNine"):
        self._c = client

    def create(self, **kwargs: Any) -> dict[str, Any]:
        kwargs["stream"] = False
        res = self._c._http.post("/v1/chat/completions", json=kwargs)
        if res.status_code >= 400:
            raise _parse_error(res)
        return res.json()

    def stream(self, **kwargs: Any) -> Iterator[dict[str, Any]]:
        kwargs["stream"] = True
        with self._c._http.stream("POST", "/v1/chat/completions", json=kwargs) as res:
            if res.status_code >= 400:
                raise _parse_error(res)
            for line in res.iter_lines():
                if not line or not line.startswith("data:"):
                    continue
                data = line[5:].strip()
                if data == "[DONE]":
                    return
                try:
                    yield json.loads(data)
                except json.JSONDecodeError:
                    continue


class _Chat:
    def __init__(self, client: "MrNine"):
        self.completions = _ChatCompletions(client)


class _Usage:
    def __init__(self, client: "MrNine"):
        self._c = client

    def me(self) -> dict[str, Any]:
        res = self._c._http.get("/v1/usage/me")
        if res.status_code >= 400:
            raise _parse_error(res)
        return res.json()


class MrNine:
    """Synchronous client.

    Args:
        api_key: API key dạng ``sk-mrnine-*``. Bắt buộc.
        base_url: Mặc định ``https://api.mrnine.net``.
        timeout: Connect/read timeout (giây). ``None`` = no read timeout (cho stream).
    """

    def __init__(
        self,
        api_key: str,
        *,
        base_url: str = "https://api.mrnine.net",
        timeout: Optional[float] = None,
        headers: Optional[Mapping[str, str]] = None,
    ):
        if not api_key:
            raise ValueError("api_key required")
        base = base_url.rstrip("/")
        self._http = httpx.Client(
            base_url=base,
            timeout=httpx.Timeout(connect=10.0, read=timeout, write=30.0, pool=5.0),
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
                "User-Agent": f"mrnine-py/{__version__}",
                **(dict(headers) if headers else {}),
            },
        )
        self.chat = _Chat(self)
        self.usage = _Usage(self)

    def models(self) -> list[dict[str, Any]]:
        res = self._http.get("/v1/models")
        if res.status_code >= 400:
            raise _parse_error(res)
        return res.json().get("data", [])

    def close(self) -> None:
        self._http.close()

    def __enter__(self) -> "MrNine":
        return self

    def __exit__(self, *exc: Any) -> None:
        self.close()


# ──────────────────────────────────────────────────────────────────
# Async client
# ──────────────────────────────────────────────────────────────────
class _AsyncChatCompletions:
    def __init__(self, client: "AsyncMrNine"):
        self._c = client

    async def create(self, **kwargs: Any) -> dict[str, Any]:
        kwargs["stream"] = False
        res = await self._c._http.post("/v1/chat/completions", json=kwargs)
        if res.status_code >= 400:
            raise _parse_error(res)
        return res.json()

    async def stream(self, **kwargs: Any) -> AsyncIterator[dict[str, Any]]:
        kwargs["stream"] = True
        async with self._c._http.stream("POST", "/v1/chat/completions", json=kwargs) as res:
            if res.status_code >= 400:
                raise _parse_error(res)
            async for line in res.aiter_lines():
                if not line or not line.startswith("data:"):
                    continue
                data = line[5:].strip()
                if data == "[DONE]":
                    return
                try:
                    yield json.loads(data)
                except json.JSONDecodeError:
                    continue


class _AsyncChat:
    def __init__(self, client: "AsyncMrNine"):
        self.completions = _AsyncChatCompletions(client)


class _AsyncUsage:
    def __init__(self, client: "AsyncMrNine"):
        self._c = client

    async def me(self) -> dict[str, Any]:
        res = await self._c._http.get("/v1/usage/me")
        if res.status_code >= 400:
            raise _parse_error(res)
        return res.json()


class AsyncMrNine:
    """Async client. Dùng ``async with``::

        async with AsyncMrNine(api_key="sk-...") as c:
            r = await c.chat.completions.create(...)
    """

    def __init__(
        self,
        api_key: str,
        *,
        base_url: str = "https://api.mrnine.net",
        timeout: Optional[float] = None,
        headers: Optional[Mapping[str, str]] = None,
    ):
        if not api_key:
            raise ValueError("api_key required")
        base = base_url.rstrip("/")
        self._http = httpx.AsyncClient(
            base_url=base,
            timeout=httpx.Timeout(connect=10.0, read=timeout, write=30.0, pool=5.0),
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
                "User-Agent": f"mrnine-py/{__version__}",
                **(dict(headers) if headers else {}),
            },
        )
        self.chat = _AsyncChat(self)
        self.usage = _AsyncUsage(self)

    async def models(self) -> list[dict[str, Any]]:
        res = await self._http.get("/v1/models")
        if res.status_code >= 400:
            raise _parse_error(res)
        return res.json().get("data", [])

    async def aclose(self) -> None:
        await self._http.aclose()

    async def __aenter__(self) -> "AsyncMrNine":
        return self

    async def __aexit__(self, *exc: Any) -> None:
        await self.aclose()
