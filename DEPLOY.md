# MrNine — Production Deploy Guide

Step-by-step từ con số 0 → mrnine.net + api.mrnine.net live, billing tự động qua VietQR + SePay.

Tổng quan kiến trúc:

```
┌─────────────────────────────────────────────────────────────┐
│                    Vercel (mrnine.net)                       │
│  Next.js 16 dashboard · Postgres + Redis (managed)           │
│  Cron: low-balance, webhook-deliver, daily-digest, reset     │
└────────────────────┬─────────────────────┬──────────────────┘
                     │                     │
            POST sepay webhook       internal API
                     │                     │
┌────────────────────▼─────────────────────▼──────────────────┐
│                  VPS (api.mrnine.net)                        │
│  FastAPI gateway · share Postgres + Redis với Vercel         │
│  Docker Compose: gateway, nginx, certbot                     │
└─────────────────────────────────────────────────────────────┘
                     │
                upstream
                     │
              aiyan.cc / openrouter.ai
```

---

## 1. Postgres + Redis (managed)

Yêu cầu: Postgres 16 + Redis 7, **publicly reachable** (cần cho cả Vercel functions lẫn VPS gateway).

Khuyến nghị:
- **Postgres**: Neon (free tier 3 GB) — lấy connection string từ dashboard
- **Redis**: Upstash (free tier 10K commands/day) — TLS URL

Set secret tạm:

```bash
export POSTGRES_URL="postgresql://user:pass@host:5432/db?sslmode=require"
export REDIS_URL="rediss://default:pass@host:6379"
```

Test:
```bash
psql "$POSTGRES_URL" -c "SELECT 1;"
redis-cli -u "$REDIS_URL" PING
```

## 2. Apply Postgres migrations

Chạy theo thứ tự, từ thư mục WebAI repo:

```bash
for f in drizzle/0001_low_balance.sql \
         drizzle/0002_coupons.sql \
         drizzle/0003_user_webhooks.sql \
         drizzle/0004_webhook_deliveries.sql \
         drizzle/0005_session_id.sql \
         drizzle/0006_audit_log.sql \
         drizzle/0007_referral.sql \
         drizzle/0008_digest.sql \
         drizzle/0009_telegram.sql \
         drizzle/0010_spend_limits.sql \
         drizzle/0011_api_key_folders.sql \
         drizzle/0012_totp.sql; do
  echo ">> $f"; psql "$POSTGRES_URL" -f "$f";
done
```

Chạy `alembic upgrade head` ở `mrnine-gateway` repo để tạo các bảng cốt lõi (users, api_keys, transactions, ledger, requests, model_map, provider_keys, daily_usage):

```bash
cd ~/Desktop/mrnine-gateway
alembic upgrade head
```

## 3. VPS gateway (api.mrnine.net)

Chi tiết: xem `mrnine-gateway/DEPLOY.md`. Tóm tắt:

```bash
ssh mrnine@<vps-ip>
git clone https://github.com/<you>/mrnine-gateway.git
cd mrnine-gateway
cp .env.example .env
# Sửa .env: POSTGRES_DSN, REDIS_URL, AIYAN_KEYS, INTERNAL_SHARED_SECRET
docker compose -f docker-compose.prod.yml up -d
```

DNS:
- `api.mrnine.net A <vps-ip>` (TTL 300)
- Test: `curl https://api.mrnine.net/health`

CORS: `mrnine-gateway/app/main.py` cần allow `https://mrnine.net` cho `/dashboard/playground` browser direct call. Mặc định nginx + CORS middleware đã wire.

## 4. Vercel project (mrnine.net)

```bash
cd ~/Desktop/WebAI
npx vercel login
npx vercel link
```

Set env qua Vercel dashboard (Project → Settings → Environment Variables) hoặc CLI:

```bash
# Database
vercel env add POSTGRES_URL
vercel env add MONGODB_URI    # Mongo Atlas free tier cho NextAuth + 5 module legacy
vercel env add REDIS_URL

# NextAuth
vercel env add AUTH_SECRET    # openssl rand -base64 32
vercel env add AUTH_GOOGLE_ID
vercel env add AUTH_GOOGLE_SECRET
vercel env add AUTH_DISCORD_ID
vercel env add AUTH_DISCORD_SECRET

# Resend (email)
vercel env add RESEND_API_KEY
vercel env add RESEND_FROM        # "MrNine <noreply@mrnine.net>"
vercel env add APP_URL            # https://mrnine.net
vercel env add CRON_SECRET        # openssl rand -hex 32

# Discord webhook (admin alerts)
vercel env add DISCORD_WEBHOOK_URL

# Gateway integration
vercel env add GATEWAY_BASE_URL       # https://api.mrnine.net
vercel env add GATEWAY_HEALTH_URL     # https://api.mrnine.net/health
vercel env add GATEWAY_OPENAPI_URL    # https://api.mrnine.net/_openapi.json

# SePay webhook auth
vercel env add SEPAY_WEBHOOK_SECRET   # token tự sinh

# Telegram bot
vercel env add TELEGRAM_BOT_TOKEN
vercel env add TELEGRAM_BOT_USERNAME
vercel env add TELEGRAM_WEBHOOK_SECRET

# Bank info
vercel env add BANK_NAME              # VPBank
vercel env add BANK_ACCOUNT_NUMBER    # 26678679999
vercel env add BANK_ACCOUNT_HOLDER    # NGUYEN HUU NAM

# Admin bootstrap
vercel env add ADMIN_EMAILS           # nguy3nhuunam@gmail.com

# Optional defaults
vercel env add USD_VND_RATE           # 25500
vercel env add MIN_TOPUP_VND          # 50000
vercel env add SIGNUP_FREE_CREDIT_USD # 0.5
vercel env add LOW_BALANCE_THRESHOLD_MICRO_USD # 500000
```

Deploy:
```bash
vercel --prod
```

DNS: `mrnine.net A 76.76.21.21` (Vercel) + `_vercel TXT ...` từ dashboard.

Verify crons: Vercel dashboard → Project → Crons. Phải thấy 4 jobs.

## 5. Resend domain verify

1. https://resend.com → Add Domain `mrnine.net`
2. Add các DNS records (TXT, MX, CNAME) vào registrar
3. Đợi 5-30 phút, click Verify
4. Test `/api/cron/low-balance-check` với header `Authorization: Bearer $CRON_SECRET`

## 6. SePay webhook

1. https://sepay.vn → đăng ký bằng số điện thoại
2. Connect bank: chọn VPBank → đăng nhập SePay app banking → cho phép SePay đọc giao dịch
3. Tạo webhook:
   - URL: `https://mrnine.net/api/billing/sepay/webhook`
   - Method: POST
   - Authorization Header: `Apikey <SEPAY_WEBHOOK_SECRET>`
   - Trigger: tất cả giao dịch đến
4. Test: chuyển khoản 50k VND tới VPBank `26678679999` với content `MR-TESTXXXX` → balance phải tự cộng trong 5-30 giây

Free tier SePay: 100 webhook/ngày. Vượt → upgrade.

## 7. Telegram bot

1. Chat với @BotFather → `/newbot` → đặt tên + username
2. Lưu `TELEGRAM_BOT_TOKEN` từ BotFather
3. Set webhook 1 lần (chạy local hoặc bất kỳ đâu):
   ```bash
   curl -X POST https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/setWebhook \
     -d "url=https://mrnine.net/api/telegram&secret_token=$TELEGRAM_WEBHOOK_SECRET"
   ```
4. Test: search `@<bot_username>` trên Telegram → `/help`

## 8. Discord webhook (alerts)

1. Server settings → Integrations → Webhooks → New Webhook
2. Copy URL → set `DISCORD_WEBHOOK_URL` ở **cả** Vercel và VPS gateway env
3. Test: signup user mới → channel phải hiện embed "🆕 New signup"

## 9. Bootstrap admin

Sau khi tạo tài khoản đầu tiên (qua `/sign-up`):

```sql
UPDATE users SET is_admin = true WHERE email = 'nguy3nhuunam@gmail.com';
```

Hoặc đăng nhập bằng email trong `ADMIN_EMAILS` → vào `/admin/users` → click promote.

## 10. Insert model_map

Vào `/admin/model-map` thêm các model bán:

| public_name | provider | provider_model | input $/MTok | output $/MTok | markup |
|---|---|---|---|---|---|
| gpt-5.4 | aiyan | gpt-5.4 | 5.0 | 20.0 | 1.20 |
| gpt-5.4-mini | aiyan | gpt-5.4-mini | 0.5 | 2.0 | 1.20 |
| claude-4.7-opus | aiyan | claude-4.7-opus | 15.0 | 75.0 | 1.20 |
| claude-4.6-sonnet | aiyan | claude-4.6-sonnet | 3.0 | 15.0 | 1.20 |
| haiku-4.5 | aiyan | haiku-4.5 | 0.8 | 4.0 | 1.20 |
| text-embedding-3-small | aiyan | text-embedding-3-small | 0.02 | 0 | 1.20 |
| whisper-1 | aiyan | whisper-1 | 6.0 | 0 | 1.20 |
| tts-1 | aiyan | tts-1 | 15.0 | 0 | 1.20 |
| dall-e-3 | aiyan | dall-e-3 | 0 | 40000 | 1.20 |
| omni-moderation-latest | aiyan | omni-moderation-latest | 0 | 0 | 1.00 |

(`output_cost_per_mtok` field cho image = USD per image × 1_000_000)

## 11. (Optional) OpenRouter failover

Tạo OpenRouter key → set ở VPS gateway `.env`:

```
OPENROUTER_KEYS=sk-or-v1-...
OPENROUTER_FALLBACK_MAP={"gpt-5.4":"openai/gpt-5","gpt-5.4-mini":"openai/gpt-5-mini"}
```

Restart gateway (`docker compose restart`). Khi aiyan trả 5xx/429/network error trên `/v1/chat/completions`, gateway tự retry qua OR.

## 12. Smoke tests

```bash
# Health
curl https://api.mrnine.net/health

# Models
curl https://api.mrnine.net/v1/models -H "Authorization: Bearer sk-mrnine-..."

# Chat
curl https://api.mrnine.net/v1/chat/completions \
  -H "Authorization: Bearer sk-mrnine-..." \
  -H "Content-Type: application/json" \
  -d '{"model":"gpt-5.4","messages":[{"role":"user","content":"hi"}]}'

# Usage me
curl https://api.mrnine.net/v1/usage/me -H "Authorization: Bearer sk-mrnine-..."

# Status page
curl https://mrnine.net/status -H "Accept: text/html" | grep "Tổng quan"
```

## 13. Monitoring (recommended)

- **Logs**: Vercel function logs + VPS `docker compose logs -f gateway` + Postgres slow query log
- **Uptime**: Better Uptime / UptimeRobot ping `https://api.mrnine.net/health` mỗi phút
- **Errors**: Sentry/Highlight optional (chưa wire)
- **Discord webhook**: tự động alert khi provider key cooldown + signup mới

## 14. Backup

- **Postgres**: Neon tự daily backup 7 ngày. Manual: `pg_dump "$POSTGRES_URL" > backup.sql`
- **Mongo**: Atlas tự backup
- **Redis**: ephemeral, không cần backup

## 15. Khi launch

- [ ] DNS `mrnine.net` + `api.mrnine.net` đã propagate
- [ ] HTTPS active cả 2 domain (Vercel auto + VPS Let's Encrypt)
- [ ] `/health` trả `{status: ok}`
- [ ] `/status` page hiển thị "Tất cả hoạt động bình thường"
- [ ] Test signup → free $0.5 → tạo API key → chat completion thành công
- [ ] Test topup VietQR thật 50k VND → email + Discord notify
- [ ] Test Telegram link → `/balance` trả đúng
- [ ] Test 2FA setup + login với TOTP
- [ ] Test referral: `/r/<code>` cookie capture → signup → topup → referrer nhận 10%
- [ ] Test webhook delivery: tạo webhook URL ngrok → trigger event → received

## 16. Rollback

Vercel: `vercel rollback <deployment-url>`.

VPS: `git checkout <prev-commit> && docker compose -f docker-compose.prod.yml up -d --build`.

Postgres migrations là forward-only — restore từ backup nếu schema phải lùi.

---

## Cost ước tính (1000 user active)

| Service | Cost/month |
|---|---|
| VPS 2vCPU/4GB (Hetzner CX22) | $4 |
| Neon Postgres (Pro) | $19 |
| Upstash Redis (Pay-as-you-go) | $5 |
| Mongo Atlas (Free) | $0 |
| Vercel (Hobby + add-on functions) | $0-20 |
| Resend (10K emails/month) | $0 (free) |
| SePay | $0 (free <100 webhook/day) |
| Domain | $1 |
| **Total** | **~$30/month** |

Markup 1.20× trên ~$1000 doanh thu/tháng → break-even ~$150 lợi nhuận đã đủ. Scale linear.
