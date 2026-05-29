# mrnine — Python SDK

Typed Python wrapper cho MrNine API gateway (https://api.mrnine.net).

Sync + async + streaming. Dựa trên `httpx`.

## Install

```bash
pip install mrnine
```

## Sign up

Tạo tài khoản tại [mrnine.net](https://mrnine.net), nạp tiền (VietQR), và lấy API key dạng `sk-mrnine-...`.

## Sync usage

```python
from mrnine import MrNine

client = MrNine(api_key="sk-mrnine-...")

# Chat completion
r = client.chat.completions.create(
    model="gpt-5.4",
    messages=[{"role": "user", "content": "Xin chào!"}],
)
print(r["choices"][0]["message"]["content"])

# Stream
for chunk in client.chat.completions.stream(
    model="gpt-5.4",
    messages=[{"role": "user", "content": "Đếm từ 1 đến 5"}],
):
    delta = chunk["choices"][0]["delta"].get("content", "")
    print(delta, end="", flush=True)

# Account
me = client.usage.me()
print(f"Balance: ${me['balance_usd']:.4f}")
print(f"30d cost: ${me['usage_30d']['cost_usd']:.4f}")

# Models
for m in client.models():
    print(m["id"])

client.close()
```

Hoặc dùng context manager:

```python
with MrNine(api_key="sk-mrnine-...") as client:
    ...
```

## Async usage

```python
import asyncio
from mrnine import AsyncMrNine

async def main():
    async with AsyncMrNine(api_key="sk-mrnine-...") as client:
        async for chunk in client.chat.completions.stream(
            model="gpt-5.4",
            messages=[{"role": "user", "content": "hi"}],
        ):
            delta = chunk["choices"][0]["delta"].get("content", "")
            print(delta, end="", flush=True)

asyncio.run(main())
```

## Custom base URL

```python
client = MrNine(
    api_key="sk-mrnine-...",
    base_url="http://localhost:8000",
)
```

## Error handling

```python
from mrnine import MrNine, MrNineError

try:
    client.chat.completions.create(...)
except MrNineError as e:
    print(e.status, e.code, str(e))
```

| status | code | meaning |
| --- | --- | --- |
| 401 | `invalid_key` / `missing_authorization` | API key sai/thiếu |
| 402 | — | Hết balance |
| 403 | — | Model không nằm trong allowed_models |
| 429 | — | Vượt RPM/TPM |
| 5xx | — | Provider upstream lỗi |

## License

MIT.
