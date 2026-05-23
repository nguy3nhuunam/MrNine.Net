// Universal client-side fetch helper that survives non-JSON responses.
//
// Vercel's edge proxy returns plain text ("An error occurred with your
// deployment") when a function times out or crashes before responding.
// Calling `await res.json()` on that body crashes with
// "Unexpected token 'A' ... is not valid JSON".
//
// This helper always reads the body as text first, tries JSON, and surfaces a
// user-friendly Vietnamese error tied to the HTTP status when the body is not
// JSON. Use it in place of `fetch + res.json()` everywhere on the client.

export type FetchJsonOptions = RequestInit & {
  /** Optional UI label used in error messages, e.g. "Tải sách". */
  label?: string;
};

export async function fetchJson<T>(url: string, init: FetchJsonOptions = {}): Promise<T> {
  const { label, ...fetchInit } = init;

  let res: Response;
  try {
    res = await fetch(url, fetchInit);
  } catch (error) {
    throw new Error(
      error instanceof Error
        ? `Lỗi mạng: ${error.message}`
        : "Lỗi mạng khi gọi server",
    );
  }

  const rawText = await res.text();

  let parsed: unknown;
  let parsedOk = false;
  if (rawText) {
    try {
      parsed = JSON.parse(rawText);
      parsedOk = true;
    } catch {
      parsedOk = false;
    }
  } else {
    parsed = {};
    parsedOk = true;
  }

  if (!res.ok) {
    if (parsedOk && parsed && typeof parsed === "object") {
      const obj = parsed as { error?: string; message?: string };
      const msg = obj.error || obj.message || `HTTP ${res.status}`;
      throw new Error(msg);
    }
    throw new Error(friendlyHttpError(res.status, rawText, label));
  }

  if (!parsedOk) {
    const snippet = rawText.slice(0, 200).replace(/\s+/g, " ").trim();
    throw new Error(
      `Server trả về dữ liệu không phải JSON${label ? ` (${label})` : ""}: ${snippet || "(rỗng)"}`,
    );
  }

  return parsed as T;
}

/** Parse a Response body that may not be JSON. Returns the parsed object on
 * success, or `{ error, _raw }` when the body fails to parse so existing
 * `if (!res.ok) throw new Error(json.error)` paths keep working.
 * Typed as `any` because client shells access dynamic shapes. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function safeParseJson(res: Response): Promise<any> {
  const text = await res.text();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    const snippet = text.slice(0, 200).replace(/\s+/g, " ").trim();
    return {
      _raw: text,
      error: `Server trả về dữ liệu không phải JSON: ${snippet || "(rỗng)"}`,
    };
  }
}

function friendlyHttpError(status: number, body: string, label?: string): string {
  const tail = label ? ` (${label})` : "";
  switch (status) {
    case 401:
      return `Cần đăng nhập${tail}.`;
    case 403:
      return `Không có quyền${tail}.`;
    case 404:
      return `Không tìm thấy${tail}.`;
    case 408:
    case 504:
      return `Hết thời gian chờ${tail}. Tác vụ đang nặng — thử lại, giảm độ dài chương, hoặc dùng pipeline rời (Plan → Write → Audit → Approve) thay vì Full pipeline.`;
    case 413:
      return `Dữ liệu gửi lên quá lớn${tail}.`;
    case 429:
      return `Quá nhiều yêu cầu${tail}, đợi vài giây rồi thử lại.`;
    case 500:
      return `Server gặp lỗi${tail}. Mở lại sau ít phút.`;
    case 502:
      return `Lỗi gateway${tail}. Có thể model bên ngoài đang lỗi — thử lại.`;
    case 503:
      return `Server đang bận${tail}. Thử lại sau.`;
    default: {
      const snippet = body.slice(0, 160).replace(/\s+/g, " ").trim();
      return `HTTP ${status}${tail}${snippet ? `: ${snippet}` : ""}`;
    }
  }
}
