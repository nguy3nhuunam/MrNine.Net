import { NextResponse } from "next/server";
import { auth } from "@/auth";

export async function requireAuth() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json(
      { error: "Cần đăng nhập để sử dụng tính năng này." },
      { status: 401 },
    );
  }
  return null;
}
