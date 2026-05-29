/**
 * POST /api/playground — server-side proxy để gọi gateway với API key của user.
 *
 * Body: { keyId, endpoint, payload, stream? }
 *  - keyId: UUID của apiKeys row, phải thuộc về user hiện tại
 *  - endpoint: "chat.completions" | "responses" | "embeddings" | "moderations"
 *  - payload: object body cho gateway
 *  - stream: bool (chỉ áp dụng cho chat.completions / responses)
 *
 * Chỉ dùng plaintext key đã lưu — KHÔNG có. Nên route này lấy key bằng cách
 * tạo một internal secret signing: gateway kiểm bằng api_key_id internal header
 * (chưa hỗ trợ). Workaround: yêu cầu user paste plaintext sk-mrnine-... vào
 * playground (giống cURL). Tránh bypass key allowed_models.
 *
 * → Quyết định MVP: client gọi trực tiếp gateway với plaintext key, không proxy
 * qua server. Route này chỉ trả về danh sách endpoint config + sample payload.
 */
import { NextResponse } from "next/server";

import { requireUser } from "@/lib/pg/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const GATEWAY = process.env.GATEWAY_BASE_URL ?? "https://api.mrnine.net";

const ENDPOINTS = [
  {
    id: "chat.completions",
    method: "POST",
    path: "/v1/chat/completions",
    sample: {
      model: "gpt-5.4",
      messages: [{ role: "user", content: "Xin chào!" }],
    },
    streamable: true,
  },
  {
    id: "responses",
    method: "POST",
    path: "/v1/responses",
    sample: { model: "gpt-5.4", input: "Đếm từ 1 đến 5" },
    streamable: true,
  },
  {
    id: "embeddings",
    method: "POST",
    path: "/v1/embeddings",
    sample: { model: "text-embedding-3-small", input: "Hello world" },
    streamable: false,
  },
  {
    id: "moderations",
    method: "POST",
    path: "/v1/moderations",
    sample: { input: "Some text to check" },
    streamable: false,
  },
  {
    id: "usage.me",
    method: "GET",
    path: "/v1/usage/me",
    sample: null,
    streamable: false,
  },
];

export async function GET() {
  await requireUser();
  return NextResponse.json({
    base_url: GATEWAY,
    endpoints: ENDPOINTS,
  });
}
