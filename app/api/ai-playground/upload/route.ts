import { NextResponse } from "next/server";
import { guardedRoute, type GuardContext } from "@/lib/api-guard";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const FAL_STORAGE_INITIATE = "https://rest.alpha.fal.ai/storage/upload/initiate";
const EMBEDDED_FAL_KEY = "d3ed1c4c-b8aa-40aa-926e-4b82ba599ae6:cae3e2004fd04235f9805226a5f96464";
const MAX_BYTES = 32 * 1024 * 1024;

function getKey() {
  return process.env.FAL_KEY || process.env.FAL_API_KEY || EMBEDDED_FAL_KEY;
}

async function _handler_POST(request: Request, _guard: GuardContext) {
  void _guard;
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Yêu cầu phải là multipart/form-data" }, { status: 400 });
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Không tìm thấy file đính kèm" }, { status: 400 });
  }
  if (file.size === 0) {
    return NextResponse.json({ error: "File rỗng" }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: `File quá lớn (${(file.size / (1024 * 1024)).toFixed(1)}MB), tối đa 32MB` },
      { status: 413 },
    );
  }

  const contentType = file.type || "application/octet-stream";
  const fileName = file.name || `upload-${Date.now()}`;
  const key = getKey();
  if (!key) {
    return NextResponse.json({ error: "FAL_KEY chưa được cấu hình" }, { status: 500 });
  }

  // Step 1: initiate — get a signed upload URL + final file_url
  const initiateRes = await fetch(FAL_STORAGE_INITIATE, {
    method: "POST",
    headers: {
      Authorization: `Key ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ file_name: fileName, content_type: contentType }),
  });
  const initiateText = await initiateRes.text();
  let initiateJson: unknown;
  try {
    initiateJson = initiateText ? JSON.parse(initiateText) : {};
  } catch {
    initiateJson = { raw: initiateText };
  }
  if (!initiateRes.ok) {
    return NextResponse.json(
      { error: "FAL initiate upload thất bại", status: initiateRes.status, detail: initiateJson },
      { status: initiateRes.status },
    );
  }
  const data = initiateJson as { upload_url?: string; file_url?: string };
  if (!data.upload_url || !data.file_url) {
    return NextResponse.json(
      { error: "FAL không trả về upload_url / file_url", detail: initiateJson },
      { status: 502 },
    );
  }

  // Step 2: PUT bytes to the signed upload URL
  const buffer = Buffer.from(await file.arrayBuffer());
  const putRes = await fetch(data.upload_url, {
    method: "PUT",
    headers: { "Content-Type": contentType },
    body: buffer,
  });
  if (!putRes.ok) {
    const detail = await putRes.text().catch(() => "");
    return NextResponse.json(
      { error: "FAL nhận file thất bại", status: putRes.status, detail },
      { status: putRes.status },
    );
  }

  return NextResponse.json({ url: data.file_url, contentType, size: file.size });
}

// Tighter limits: 32MB file uploads are an abuse vector. 10/min keeps any
// realistic UI flow happy while shutting down a flood.
export const POST = guardedRoute(
  {
    route: "ai-playground-upload",
    requireUser: true,
    rate: { user: { perMinute: 10, perHour: 80 } },
  },
  _handler_POST,
);
