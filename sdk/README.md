# @mrnine/sdk

Typed TypeScript wrapper cho MrNine API gateway (https://api.mrnine.net).

OpenAI-compatible — nếu bạn quen `openai` SDK, đây là thay thế nhỏ gọn không phụ thuộc.

## Install

```bash
npm install @mrnine/sdk
# hoặc
pnpm add @mrnine/sdk
```

## Sign up

Tạo tài khoản tại [mrnine.net](https://mrnine.net), nạp tiền (VietQR), và lấy API key dạng `sk-mrnine-...` từ dashboard.

## Usage

```ts
import { MrNine } from "@mrnine/sdk";

const client = new MrNine({ apiKey: process.env.MRNINE_API_KEY! });

// Chat completion
const r = await client.chat.completions.create({
  model: "gpt-5.4",
  messages: [{ role: "user", content: "Xin chào!" }],
});
console.log(r.choices[0]?.message?.content);

// Stream
for await (const chunk of client.chat.completions.stream({
  model: "gpt-5.4",
  messages: [{ role: "user", content: "Đếm từ 1 đến 5" }],
})) {
  process.stdout.write(chunk.choices[0]?.delta?.content ?? "");
}

// Account
const me = await client.usage.me();
console.log("Balance:", me.balance_usd, "USD");
console.log("30d cost:", me.usage_30d.cost_usd, "USD");

// Models
const models = await client.models();
console.log(models.map((m) => m.id));
```

## Custom base URL

Hữu ích khi self-host hoặc test:

```ts
const client = new MrNine({
  apiKey: "sk-mrnine-...",
  baseUrl: "http://localhost:8000",
});
```

## Error handling

```ts
import { MrNine, MrNineError } from "@mrnine/sdk";

try {
  await client.chat.completions.create({ ... });
} catch (e) {
  if (e instanceof MrNineError) {
    console.error(e.status, e.code, e.message);
  } else {
    throw e;
  }
}
```

Common errors:

| status | code | meaning |
| --- | --- | --- |
| 401 | `invalid_key` / `missing_authorization` | API key sai hoặc thiếu |
| 402 | — | Hết balance — nạp thêm tại `/dashboard/billing` |
| 403 | — | Model không nằm trong allowed_models của key |
| 429 | — | Vượt RPM/TPM |
| 5xx | — | Provider upstream lỗi |

## License

MIT.
