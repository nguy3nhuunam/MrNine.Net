# TODO — Deploy Gateway lên VPS (làm sau)

> Tạm hoãn 2026-05-30 để code thêm feature cho web chính. Đây là phần CÒN LẠI duy nhất chặn go-live. Feature stack + Vercel + DB đã xong (xem `DEPLOY.md` cho guide đầy đủ 16 bước).

## Trạng thái hiện tại (verify thật, không đoán)

**Đã LIVE & verified:**
- Neon Postgres (`ap-southeast-1` Singapore, pooler + non-pooler) — 15 bảng, migrations xong.
- Upstash Redis — PONG.
- Vercel prod `mrnine.net` HTTP 200, domain trỏ đúng. Đã set đủ 30+ env vars, redeploy Ready.
- `model_map` seed 6 model chat THẬT của aiyan, markup 1.20×. `/pricing` live hiện đủ.
- Gateway smoke-test **PASS** trên Docker local (Neon+Upstash thật): /health 200, chat completion gpt-5.4 → 200, billing chính xác (210μ$ → 252μ$ markup 1.20× → profit 42μ$). Code production-ready.
- `.env` gateway đã ghi secret thật (gitignored).

## CÒN LẠI — 3 việc chặn, cần thao tác tay

### 1. VPS cho gateway (`api.mrnine.net` hiện HTTP 000)

**Quyết định: Hetzner Cloud — gói CX22** (2 vCPU Intel / 4GB / 40GB / ~€3.79/mo).
- Location: Nuremberg hoặc Falkenstein (Đức). Image: Ubuntu 24.04. Type: Shared vCPU x86 → CX22.
- ⚠️ Hetzner KHÔNG có data center châu Á → ghi billing tới Neon (Singapore) ~150-180ms/request. Chấp nhận được vì proxy tới aiyan (LLM) đã mất vài giây, 150ms cuối không đáng kể. Đổi lại rẻ + RAM gấp đôi Vultr.
- (Phương án thay thế nếu muốn latency thấp: Vultr Singapore 2GB ~$10/mo.)

**User cần làm:**
1. Mua VPS Hetzner CX22 Ubuntu 24.04 → lấy **IPv4 + root password** (password gửi qua email lúc tạo server).
2. Tạo repo GitHub `mrnine-gateway` (gateway repo CHƯA có git remote, `gh` CLI chưa cài) → đưa Claude repo URL.
3. Trỏ DNS `api.mrnine.net A <IP VPS>` (trỏ sớm để Let's Encrypt kịp lan truyền).

**Claude sẽ làm khi có IP + password + repo URL:**
- SSH vào cài Docker + Docker Compose.
- Push code gateway lên GitHub, clone về VPS.
- Sửa `.env`: `POSTGRES_DSN` + `REDIS_URL` trỏ **Neon + Upstash chung** (KHÔNG dùng postgres/redis local trong docker-compose.yml).
- Chạy `scripts/init-tls.sh api.mrnine.net <email>` — tự lo SSL Let's Encrypt.
- Verify `/health` 200.

### 2. SePay (nạp tiền tự động)
- Đăng ký sepay.vn, connect VPBank `26678679999` (NGUYEN HUU NAM).
- Webhook: `https://mrnine.net/api/billing/sepay/webhook`, header `Apikey 7f00bc058f485111e3c0e532238aaa4558052f4fe0e215b8`.

### 3. Resend (email topup/low-balance/digest)
- Verify domain `mrnine.net`, lấy API key → đưa Claude set `RESEND_API_KEY` lên Vercel.

## Optional (sau launch)
Telegram bot, Discord webhook, OpenRouter failover, publish SDK (npm + PyPI).

## Repo paths
- Gateway: `C:\Users\Mr Nine\Desktop\mrnine-gateway` (FastAPI, commit `1e4d1cf`, chưa có remote)
- WebAI: `C:\Users\Mr Nine\Desktop\WebAI` (Next.js 16, commit `244beeb`)
