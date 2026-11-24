# IQ NMS — Unified Dashboard

A single web dashboard for the Identiqa network monitoring stack. It brings together
data from **Zabbix** (hosts, problems, triggers, metrics), **Zammad** (tickets),
**Grafana Loki** (logs) and **Oxidized** (device config backups) behind one
Node.js API gateway.

## Features

| Page | What it shows | Source |
|---|---|---|
| Overview | Host availability and problem severity at a glance | Zabbix |
| Hosts / Host details | Host list, items, history and trend graphs, alerts | Zabbix |
| Problems | Active problems and triggers | Zabbix |
| Topology | Zabbix network maps | Zabbix |
| Logs | Recent logs, search, per-host logs, problem/log correlation | Loki |
| Tickets | Helpdesk tickets | Zammad |
| Reports | Summary reports | Zabbix |

## Architecture

```
Browser ──► Nginx (:80) ──┬─► static frontend (index.html, pages/, *.js)
                          └─► /api/* ──► Node.js gateway (:3001)
                                              ├─► Zabbix JSON-RPC API
                                              ├─► Zammad REST API
                                              ├─► Loki HTTP API
                                              └─► Oxidized REST API
```

- **Frontend** — plain React 18 + Recharts + Tailwind loaded from CDNs, with JSX
  compiled in the browser by Babel. No build step.
- **Backend** (`backend/`) — Express API gateway (`iq-nms-api`) with response
  caching, Winston logging and a central error handler. It also serves the
  frontend directly if you are not using Nginx.

## Project layout

```
index.html, app.js, api.js, components.js, utils.js   Frontend entry and shared code
pages/                                                 One file per dashboard page
Assets/                                                Logo / favicon
backend/
  server.js             Express app and route mounting
  routes/               /api/zabbix, /api/zammad, /api/logs, /api/oxidized, /api/reports, /api/health
  services/             Clients for Zabbix, Zammad, Loki, Oxidized
  middleware/           Cache, logger, error handler
  ecosystem.config.js   PM2 config (cluster mode)
  nginx.conf            Example Nginx site
  .env.example          Configuration template
```

## Requirements

- Node.js 18 or newer
- Network access from the server to your Zabbix, Zammad, Loki and Oxidized instances
- Optional: Nginx and PM2 for production

## Setup

```bash
cd backend
npm install
cp .env.example .env
# edit .env with your own URLs and credentials
npm start            # or: npm run dev  (auto-restart on change)
```

Open `http://localhost:3001`.

### Configuration (`backend/.env`)

| Variable | Description |
|---|---|
| `PORT` | Gateway port (default `3001`) |
| `ZABBIX_URL` | Zabbix API endpoint, e.g. `http://zabbix-host:8080/api_jsonrpc.php` |
| `ZABBIX_USER`, `ZABBIX_PASSWORD` | Zabbix API user |
| `ZAMMAD_URL` | Zammad API base, e.g. `https://zammad.example.com/api/v1` |
| `ZAMMAD_TOKEN` *or* `ZAMMAD_EMAIL` + `ZAMMAD_PASSWORD` | Zammad token auth or basic auth |
| `LOKI_URL` | Loki base URL, e.g. `http://loki-host:3100` |
| `LOKI_TIMEOUT`, `LOKI_CACHE_TTL`, `LOKI_MAX_LIMIT` | Loki request timeout (ms), cache TTL (s), max lines per query |
| `OXIDIZED_URL` | Oxidized REST URL, e.g. `http://oxidized-host:8888` |

> **Never commit `backend/.env`.** It is listed in `.gitignore`; keep real
> credentials only on the server.

## Production deployment

1. Copy the frontend files (everything except `backend/`) to `/var/www/iq-nms`.
2. Run the gateway with PM2:
   ```bash
   cd backend
   npm install --omit=dev
   npx pm2 start ecosystem.config.js
   ```
3. Install `backend/nginx.conf` as an Nginx site (adjust `server_name`) and reload Nginx.

## Health check

```bash
curl http://localhost:3001/api/health
```
