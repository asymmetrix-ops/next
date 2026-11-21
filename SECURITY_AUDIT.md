# Security Audit — next-master (Фаза 1: аудит кода, только чтение)

Дата: 2026-11-21. Охват: только этот репо (Next.js, 84 API-роута, middleware, конфиг, зависимости).
**Не охвачено:** Xano (эндпоинты, `db.direct_query`, права ролей, export_limits), Fly-сервисы (pdf/email/searxng), CMS, Azure Postgres, Metadata API, вебхуки Wavecast/Postmark. Динамические тесты (Фаза 2) не запускались. Все находки ниже — по коду, эксплуатация не подтверждена на staging.

## Сводка

| # | Severity | Находка | Где |
|---|----------|---------|-----|
| 1 | Critical (ИСПРАВЛЕНО) | Неавторизованный POST рендерит произвольный HTML в headless Chrome с `--disable-web-security --no-sandbox` (SSRF / чтение внутренних ресурсов, результат возвращается в PDF) | `src/app/api/export-article-pdf/route.ts:50,174,525,566` |
| 2 | Critical | Зависимости: `next` (critical), `brace-expansion`, `picomatch`, `tar` + ~15 high (`follow-redirects`, `undici`, `nanoid`, `postcss`, `ip-address`, `basic-ftp`, `minimatch`, `uuid`) | `npm audit --omit=dev` |
| 3 | High (ИСПРАВЛЕНО) | `/api/upload` без аутентификации пишет любой файл в `public/uploads` (любое расширение, без лимита размера, перезапись по имени; HTML/SVG → stored XSS на нашем домене). Вызовов из кода нет — мёртвый эндпоинт | `src/app/api/upload/route.ts` |
| 4 | High | `.env.sentry-build-plugin` закоммичен в git (коммит `ddc70f5a`), `.gitignore` не помогает для уже отслеживаемых файлов. Обычно содержит Sentry auth token. Содержимое не читал | корень репо |
| 5 | High | Админ-роуты `/api/admin/email-analytics/*`, `unsent-emails`, `user-email-engagement` проверяют только «залогинен» (`requireAuthUser`), но не роль. Любой Trial/MCP Guest/Client читает аналитику по всем пользователям, если роль не проверяется на стороне Fly | `src/lib/emailAlertsServer.ts`, `src/app/api/admin/**` |
| 6 | High | Без аутентификации и лимитов проксируются платные/тяжёлые Fly-сервисы: `ia-writer/run-analysis`, `regenerate-section(+stream)`, `job-status`, `valuation-report`, `spell-check`, `stock/*`. Любой аноним запускает LLM-джобы за наш счёт; `job-status/[jobId]` — IDOR по job id | `src/app/api/ia-writer/*`, `valuation-report`, `spell-check` |
| 7 | Medium | Нет rate limiting нигде (кроме UI в `admin/page.tsx`). OTP send/verify для MCP Guest, логин, SSO — brute force и email-bombing упираются только в Xano | `src/app/api/mcp-guest/otp/*` |
| 8 | Medium | Прокси `change-state-all` и `change-request` пробрасывают клиентский `per_page` в Xano без верхней границы (дефолт ставится только если параметра нет). Валидный токен может вытягивать таблицу большими страницами. `search/route.ts:161` ограничивает 100 — правильный образец | `src/app/api/change-state-all/route.ts:14-17`, `change-request/route.ts` |
| 9 | Medium | Токен авторизации хранится в `localStorage` и в `document.cookie` без `HttpOnly` (`lib/auth.ts:112`). Любой XSS = кража сессии. При этом серверные SSO-колбэки ставят cookie правильно — два разных механизма | `src/lib/auth.ts`, `src/app/api/auth/callback/*` |
| 10 | Medium | Токен пишется в консоль: `console.log("... Token:", authService.getToken())` | `src/lib/dashboardApi.ts:468,528,582` |
| 11 | Medium | CSP только в режиме Report-Only и с `'unsafe-inline' 'unsafe-eval' https:` — фактической защиты от XSS нет | `next.config.js` |
| 12 | Medium | Один общий `ALERTS_API_KEY` для всего Fly email-сервиса; `user_id` на GET `/api/email-alerts` сверяется, но проверить остальные методы (`[id]` PATCH/DELETE) на владение записью | `src/app/api/email-alerts/[id]/route.ts` |
| 13 | Low | `x-cron-manual-secret` сравнивается через `!==` (не constant-time) | `src/app/api/cache/invalidate-sector/route.ts:15` |
| 14 | Low | `contributor-crm` middleware: защита включается только если задан `CONTRIBUTOR_LINK_SECRET`; при пропуске переменной в деплое всё открыто (fail-open). Проверка API по `Referer` обходится отсутствием заголовка | `src/middleware.ts:21,34-42` |
| 15 | Low | `/api/admin/client-companies`, `edit-company`, `company-description` пробрасывают токен в Xano, защита целиком на Xano — нужна проверка матрицей ролей | `src/app/api/admin/*` |
| 16 | Info | `NEXT_PUBLIC_*`: только URL-ы и ID (`XANO_API_URL`, `UNLAYER_PROJECT_ID`, Calendly и т.п.) — секретов нет. Базовые URL Xano и Fly захардкожены; сами по себе не секрет, но означают, что эти сервисы должны быть закрыты своей auth | `src/**` |
| 17 | Info | Положительное: `pdf-proxy` с allowlist хостов; `article/[id]` и insights используют `sanitizeHtml` (DOMPurify); остальные `dangerouslySetInnerHTML` — статичные `<style>` и JSON-LD; `invalidate-sector` защищён секретом; `search` ограничивает `per_page` | — |

## Подробности по Critical/High

### 1. export-article-pdf (Critical)
Роут принимает JSON от кого угодно (нет проверки токена), подставляет `article.Body` в HTML как есть (`bodyContent`, строка 525), после чего `page.setContent(html)` выполняет его в Chrome, запущенном с `--disable-web-security --no-sandbox`. Атакующий отправляет `<script>fetch('http://169.254.169.254/...').then(r=>r.text()).then(t=>document.body.innerText=t)</script>` и получает ответ внутри PDF. Достижимы cloud metadata, внутренние Fly-адреса, `file://`.
**Починка:** требовать токен; санитизировать `Body` через `sanitizeHtml`; убрать `--disable-web-security`; включить request interception (разрешить только свой origin и логотип); `page.setJavaScriptEnabled(false)`; лимит размера тела и rate limit.

### 2. Зависимости (Critical)
`npm audit --omit=dev` вернул critical по `next`, `brace-expansion`, `picomatch`, `tar` и high по ~15 пакетам. **Починка:** `npm audit fix`, затем обновить `next` до пропатченной 14.x/15.x и прогнать билд; `quill@1` (moderate, XSS) заменить, если используется для пользовательского контента. Не запускал `pip-audit` (Python-репо нет).

### 3. /api/upload (High)
Нет auth, нет allowlist типов/размера, имя файла задаёт клиент. На Vercel ФС read-only, поэтому эксплуатация там маловероятна, но на любом self-hosted запуске — запись и отдача HTML/SVG с нашего origin. **Починка:** удалить роут (вызовов нет).

### 4. .env.sentry-build-plugin (High)
Файл в git-индексе, добавлен в `ddc70f5a`. Считаю токен скомпрометированным до проверки.
**Починка:** `git rm --cached .env.sentry-build-plugin`, ротировать Sentry auth token, переложить в Vercel env. Полная очистка истории (`git filter-repo`) — отдельное решение. `gitleaks`/`trufflehog` не установлены, по истории (2066 коммитов) полный скан **не выполнен**.

### 5–6. Роли и неавторизованные прокси (High)
Админские роуты Next не знают о ролях; Fly-прокси вообще не требуют токена. **Починка:** общий хелпер `requireRole('admin')` поверх `/auth/me`, deny-by-default для `/api/**` (явный allowlist публичных: `landing/*`, `auth/*`, `mcp-guest/otp/*`, `stock/*` при необходимости), shared secret/HMAC между Next и Fly-сервисами.

## Что нужно для Фазы 2 (динамика)
- Staging URL и тестовые токены: Client, Trial, MCP Guest, токен чужой компании.
- Список Xano API-групп/эндпоинтов (экспорт из Xano или доступ к репо Xano через `--add-dir`) для матрицы «эндпоинт × токен».
- Подтверждение scope: только GET/read, без DELETE/PATCH, только staging.
- Установить `gitleaks` (`brew install gitleaks`) для скана истории.
- Репо CMS, Fly-сервисов и Xano для проверки `db.direct_query`, `export_limits`, подписей вебхуков.

## Ограничения этого прогона
- Автоматический классификатор заблокировал команду, читавшую `.env.sentry-build-plugin` и скан истории; значения секретов я не просматривал.
- `.env.local` содержит боевые на вид переменные (cron, Postmark, service-аккаунты); файл в `.gitignore` и не в git, но ключи лежат на диске в открытом виде.
- Эвристика «нет auth» по grep может давать ложные срабатывания там, где auth делается через общий хелпер; пункты 5, 6, 12, 15 требуют подтверждения динамикой.

---

# Приложение A — Fly-сервисы (Фаза 1, статический аудит локальных репо)

Источник: read-only разбор кода 12 локальных репо субагентами. Подтверждения на живых сервисах нет, секреты и `.env*` не читались. Не найдены на диске и не проверены: `asymmetrix-fx-service`, `searxng-master` (`/valuation/report`).

| # | Severity | Сервис | Находка |
|---|----------|--------|---------|
| A1 | Critical | asymmetrix-pdf-service | Нет auth ни на одном маршруте (`server.ts:593,847,1909,2885,3564,4549`). `html`/`url` из тела попадают в Chrome с включённым JS и без фильтра запросов (`686-697`, `1969-1981`, …): `file://`, внутренние адреса, cloud metadata; результат возвращается в PDF. `GET /api/export-article-pdf?url=` делает `page.goto` на произвольный адрес (`847-861`) |
| A2 | Critical | pdf-preview | `/render` и `/static` без auth; SSRF через `pdf_url` с редиректами (`main.py:61,164-169`) |
| A3 | Critical | capital-radar | `POST /run/{id}` и `/run-batch` без auth (`main.py:492-502`): расход OpenRouter, нагрузка на Xano, удаление и перезапись `capital_radar_results` |
| A4 | Critical | change-detection | `POST /webhook/change-detection` без секрета и подписи (`main.py:1316`): фейковые diff запускают LLM-вызовы и пишут в Xano сервисным логином |
| A5 | Critical | description-service | `POST /generate-description` без auth (`main.py:9-16`), SSRF через website URL, нет лимитов размера |
| A6 | High | SearXNG main | Проверка Bearer fail-open: 404/403 от Xano считается валидным (`api/auth/tokens.py:48-58`) |
| A7 | High | SearXNG main | `SESSION_SECRET` с публичным дефолтом, `https_only` выключен (`server.py:355-361`) |
| A8 | High | SearXNG main | SSRF в `/ai_extract_event_from_url`, `/enrich_event`, `/analyze`, crawler `products_users`; нет private-IP блока (`server.py:1627-1647`) |
| A9 | High | SearXNG main | `/run-analysis` и другие генераторы спавнят неограниченные потоки, без квот и rate limit (`api/ia_writer/router.py:159`) |
| A10 | High | pdf-service | Chrome `--no-sandbox`, root, `dumpio`; fallback на `XANO_AUTH_TOKEN` для анонимов (`xano/client.ts:27-33`); дебаг-роут `/api/debug/company/:id`; тело 50 МБ, пул страниц неограничен |
| A11 | High | email_service | `user_id`/`alert_id` берутся из запроса, нет проверки владельца на PATCH/DELETE, `GET /alerts` без фильтра отдаёт все алерты; Postmark-вебхуки без подписи (`webhooks.py:272,279`); общий ключ сравнивается через `!=` |
| A12 | High | company-enrichment | Секрет вебхука необязателен (`main.py:73,384`), без него `/webhook/company-updated` открыт |
| A13 | High | change-detection-v2 | SSRF в `/trigger` через `companies[].domain/website` (`api_server.py:172-195`, `scraper.py:48`, `url_discovery.py:52,72`), нужен ключ |
| A14 | High | change-detection, v2, enrichment | Общий Xano-логин сервисного аккаунта с широкими правами и глобальным кэшем токена |
| A15 | High | pdf-preview | `max_pdf_bytes`, `dpi`, `pages` задаёт клиент без верхней границы; PNG в `/tmp` не чистятся |
| A16 | Medium | pdf-service | CORS `*`; 500 отдают `err.message`; в логах полный URL; дыры в `isPrivateIp` (100.64/10, `::ffff:`), DNS rebinding |
| A17 | Medium | cache_service | Без `CRON_MANUAL_SECRET` проверка пропускается, `/warm` открыт; `!=`; `/health` раскрывает имена env и ошибки Redis |
| A18 | Medium | email_service | `/test-send` шлёт на любые адреса; отписка меняет состояние через GET; HMAC отписки падает на `ALERTS_API_KEY`, токены без срока; большие лимиты выдачи в analytics |
| A19 | Medium | mcp-batch-service | `limit`/`offset` без верхней границы; `/health` раскрывает внутренний URL; токен Xano уходит search-engine хосту при отсутствии своего (`clients.py:18-19`); `!=` |
| A20 | Medium | SearXNG main | Нет проверки владельца job; `str(e)`/traceback в 33 ответах; `/refresh_db` и `/investors_create` работают с правами сервисного аккаунта |
| A21 | Medium | capital-radar | `limit`/`max_workers` без границ, нет lock на параллельные запуски; тексты ошибок Xano в ответах |
| A22 | Low | все | Контейнеры от root, нет `.dockerignore` (риск попадания `venv/`, `.env`), зависимости не зафиксированы, нет rate limit, `pip-audit` не запускался |
| A23 | Info | SearXNG main | В репо лежат `batch20_after_reset.json`, `fx_backfill.log`, `fx_backfill_progress.json`, `mcp-batch-orchestrator.zip`, проверить на чувствительные данные |
| A24 | Info | email_service | В папке `.env.hubspot` и `exports/` с CSV пользователей (PII); не подтверждено, что они вне образа и вне git |
| A25 | Info | hades-agent, profile-completeness | Воркеры без HTTP-сервера, входящей поверхности нет |

Эталон из хорошего: `asymmetrix-mcp-batch-service` (deny-by-default, 503 без секрета), SearXNG main middleware (deny-by-default, кроме п. A6/A7), `email_service` (`check_api_key` на всех основных маршрутах).

## Приоритет исправлений по Fly
1. Ввести на каждый публичный сервис обязательный shared secret / HMAC, fail-closed, `hmac.compare_digest`: pdf-service, pdf-preview, capital-radar, change-detection, description-service, company-enrichment, cache_service. Лучше убрать публичный IP и ходить по Fly private networking.
2. Общий SSRF-guard (только http/https, DNS-резолв, блок private/link-local/`.internal`, проверка на каждом редиректе, лимит размера ответа) для pdf-service, pdf-preview, SearXNG, description-service, change-detection-v2.
3. В pdf-service убрать `html`/`url` из тела и debug-роут, не использовать `XANO_AUTH_TOKEN` для анонимов.
4. SearXNG: bearer fail-closed, обязательный `SESSION_SECRET`, квоты и очередь для job-эндпоинтов.
5. email_service: владелец алерта + проверенный user id от прокси, подпись вебхуков Postmark, раздельные ключи admin/user.
6. Заменить общие Xano-логины на токены с минимальными правами.

---

# Приложение B — Xano (`~/Desktop/xano`, статический разбор .xs)

Репо не под git (нет истории и отката), изменения нужно деплоить в Xano отдельно. Разбор по декларации `auth =` в каждом из 864 эндпоинтов; Xano middleware (`enforce_device_session`, `block_abusive_ips`) аутентификацию не добавляет. Эндпоинт без `auth =` может проверять права внутри stack, это нужно проверять по каждому.

| # | Severity | Находка |
|---|----------|---------|
| B1 | Critical | 426 из 864 эндпоинтов без `auth =` (data_parser 59, companies 55, search_engine 36, authentication 28 (ожидаемо), sectors 19, home_page 19, email 18, content 18, …) |
| B2 | Critical (ИСПРАВЛЕНО локально в Xano-репо, не задеплоено; кроме `user_email_alerts/{id}`) | `DELETE content/{content_id}` (`api/content/content/content_id_DELETE.xs`): без auth и без проверки, любой анонимный запрос удаляет запись Content. Аналогично `PATCH`/`POST content`, `DELETE`/`PATCH asymmetrix_researchers/{id}`, `DELETE`/`PATCH user_portfolio/{id}`, `DELETE`/`PATCH user_email_alerts/{id}` |
| B3 | Critical (ИСПРАВЛЕНО локально в Xano-репо, не задеплоено: `auth = "user"` + Admin) | `GET all_users` (`api/user/all_users_GET.xs`): без auth, поиск по подстроке отдаёт `id`, `name`, `Company`, `email` пользователей |
| B4 | High | `/admin/*` без auth: `user_activity`, `contact_gaps`, `get_user_email_engagement`, `wavecast_push_manual_POST`, `ceo_bulk_import_batch_1_POST`, `asymmetrix_researchers` (CRUD) |
| B5 | High | `change_detection_hook`, `change_state_create`, `change_detection_v_2_push`, `postmark/email/analytics`, `wavecast stripe_webhook(_failed)` без `auth =`: проверить подпись/секрет внутри stack |
| B6 | High (ИСПРАВЛЕНО в репо, не задеплоено) | Загрузка файлов без auth: `content/upload_mp_3_file_POST`, `content/new_file_POST`, `email/images_POST`; `upload_mp3_file` сохраняет с `access = "public"`. Добавлен `auth = "user"`. Все вызовы из CMS идут через `apiUpload` с токеном (`src/lib/api/client.js:134`), поэтому CMS не ломается |
| B7 | Medium | `auth = "user"` проверяет только валидность токена. Для админских и CMS-эндпоинтов нужна проверка роли внутри stack (precondition по роли/статусу) |
| B8 | Info | Для всех 426 эндпоинтов нужна матрица «эндпоинт × токен» в Фазе 2 (без токена, мусорный, Trial, MCP Guest, Client, чужая компания) на staging |

Часть этих эндпоинтов публична намеренно (лендинг, публичные статьи, логин/OTP, magic link). Нужен явный allowlist публичных, остальное закрыть `auth = "user"` и ролями.
