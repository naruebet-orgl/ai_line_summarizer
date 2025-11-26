# DigitalOcean App Platform Deployment Guide

This guide explains how to deploy the LINE Chat Summarizer AI monorepo to DigitalOcean App Platform.

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                  DigitalOcean App Platform              │
│                                                         │
│  ┌─────────────────┐        ┌─────────────────┐        │
│  │     Backend     │        │       Web       │        │
│  │  (Express API)  │◄──────►│   (Next.js)     │        │
│  │   Port 3001     │        │   Port 3000     │        │
│  └────────┬────────┘        └────────┬────────┘        │
│           │                          │                  │
│           ▼                          ▼                  │
│  ┌─────────────────────────────────────────────┐       │
│  │              Managed Routes                  │       │
│  │         /api/* → Backend                     │       │
│  │           /*   → Web                         │       │
│  └─────────────────────────────────────────────┘       │
└─────────────────────────────────────────────────────────┘
                           │
                           ▼
               ┌───────────────────────┐
               │   MongoDB Atlas       │
               │   (External)          │
               └───────────────────────┘
```

## Prerequisites

1. DigitalOcean account
2. GitHub repository connected to DigitalOcean
3. MongoDB Atlas database (or DigitalOcean Managed MongoDB)
4. LINE Messaging API credentials
5. Google Gemini API key

## Quick Deploy

### Option 1: Using App Spec (Recommended)

1. Fork/push this repository to GitHub
2. Go to DigitalOcean → Apps → Create App
3. Choose "Import from GitHub"
4. Select this repository and branch `dev_commercial`
5. DigitalOcean will detect `.do/app.yaml` automatically
6. Configure secrets in the UI
7. Deploy

### Option 2: Manual Setup

1. Create a new App in DigitalOcean
2. Add two services from the same repository:
   - **Backend**: Source directory `apps/backend`
   - **Web**: Source directory `apps/web`
3. Configure each service according to the sections below

## Service Configuration

### Backend Service

**Source Settings:**
- Source directory: `apps/backend`
- Dockerfile path: `apps/backend/Dockerfile`
- Branch: `dev_commercial`

**Resources:**
- Instance size: Basic XXS ($5/mo) or higher
- Instance count: 1 (scale as needed)

**HTTP Settings:**
- Port: 3001
- Routes: `/api`

**Environment Variables:**
```bash
# Required
NODE_ENV=production
PORT=3001
MONGODB_URI=<your-mongodb-connection-string>
MONGODB_DB_NAME=ai_summary
LINE_CHANNEL_ID=<your-line-channel-id>
LINE_CHANNEL_SECRET=<your-line-channel-secret>
LINE_CHANNEL_ACCESS_TOKEN=<your-line-channel-access-token>
GEMINI_API_KEY=<your-gemini-api-key>
JWT_SECRET=<generate-64-char-hex>
ENCRYPTION_KEY=<generate-64-char-hex>

# CORS (update after deployment)
FRONTEND_URL=https://your-app.ondigitalocean.app
CORS_ORIGIN=https://your-app.ondigitalocean.app

# Session config (optional)
SESSION_MAX_MESSAGES=50
SESSION_TIMEOUT_HOURS=24
SESSION_MIN_MESSAGES_FOR_SUMMARY=1
```

**Health Check:**
- Path: `/api/health`
- Initial delay: 10 seconds

### Web Service

**Source Settings:**
- Source directory: `apps/web`
- Dockerfile path: `apps/web/Dockerfile`
- Branch: `dev_commercial`

**Resources:**
- Instance size: Basic XXS ($5/mo) or higher
- Instance count: 1

**HTTP Settings:**
- Port: 3000
- Routes: `/` (catch-all)

**Environment Variables:**
```bash
# Required
NODE_ENV=production
PORT=3000
MONGODB_URI=<your-mongodb-connection-string>
MONGODB_DB_NAME=ai_summary
BETTER_AUTH_SECRET=<generate-secure-random-string>
SESSION_SECRET=<generate-secure-random-string>

# API URL (update after deployment)
NEXT_PUBLIC_API_URL=https://your-app.ondigitalocean.app/api
BACKEND_URL=http://backend:3001  # Internal service communication
```

**Health Check:**
- Path: `/api/health`
- Initial delay: 15 seconds

## Post-Deployment Setup

### 1. Get Your App URL

After deployment, note your app URL:
```
https://your-app-xxxxx.ondigitalocean.app
```

### 2. Update Environment Variables

Update the following variables with your actual app URL:
- Backend: `FRONTEND_URL`, `CORS_ORIGIN`
- Web: `NEXT_PUBLIC_API_URL`

### 3. Configure LINE Webhook

Update your LINE Bot webhook URL in LINE Developers Console:
```
https://your-app-xxxxx.ondigitalocean.app/api/line/webhook
```

### 4. Verify Deployment

Test the endpoints:
```bash
# Backend health
curl https://your-app.ondigitalocean.app/api/health

# Web health
curl https://your-app.ondigitalocean.app/api/health

# LINE webhook verification
curl https://your-app.ondigitalocean.app/api/line/health
```

## Generating Secrets

```bash
# Generate 64-character hex strings for JWT_SECRET, ENCRYPTION_KEY
openssl rand -hex 32

# Generate secure random strings for other secrets
openssl rand -base64 32
```

## Custom Domain

1. Go to App Settings → Domains
2. Add your custom domain
3. Configure DNS:
   - Add CNAME record pointing to `your-app.ondigitalocean.app`
   - Or use DigitalOcean nameservers

## Scaling

### Horizontal Scaling
Increase instance count in App Settings:
```yaml
instance_count: 2  # or more
```

### Vertical Scaling
Upgrade instance size:
- `basic-xxs`: 512 MB RAM, shared CPU
- `basic-xs`: 1 GB RAM, shared CPU
- `basic-s`: 2 GB RAM, shared CPU
- `professional-xs`: 1 GB RAM, dedicated CPU

## Monitoring

### Built-in Metrics
- CPU usage
- Memory usage
- Request count
- Response time
- Error rate

### Logs
View logs in DigitalOcean Console:
1. Go to Apps → Your App
2. Click on Runtime Logs
3. Filter by component (backend/web)

### Alerts
Configure alerts in `.do/app.yaml`:
```yaml
alerts:
  - rule: DEPLOYMENT_FAILED
  - rule: DOMAIN_FAILED
  - rule: CPU_UTILIZATION
    value: 80
    operator: GREATER_THAN
    window: FIVE_MINUTES
```

## Troubleshooting

### Build Failures

**pnpm not found:**
Ensure Dockerfile installs pnpm:
```dockerfile
RUN corepack enable && corepack prepare pnpm@9.14.2 --activate
```

**Missing dependencies:**
Check that `pnpm-lock.yaml` exists in the source directory.

### Runtime Errors

**Cannot connect to MongoDB:**
- Verify `MONGODB_URI` is correct
- Check MongoDB Atlas IP whitelist (add `0.0.0.0/0` or DigitalOcean IPs)

**CORS errors:**
- Verify `CORS_ORIGIN` matches your app domain exactly
- Ensure protocol is correct (https://)

**502 Bad Gateway:**
- Check health check path is correct
- Increase health check timeout
- Check application logs for errors

### Service Communication

**Backend not reachable from Web:**
Use internal service URL:
```
BACKEND_URL=http://backend:3001
```
Not the public URL.

## Cost Estimation

Minimum setup (~$12/mo):
- Backend: Basic XXS ($5/mo)
- Web: Basic XXS ($5/mo)
- Bandwidth: ~$0-2/mo (first 1TB free)

Production setup (~$30-50/mo):
- Backend: Basic S ($12/mo) x 2 instances
- Web: Basic S ($12/mo) x 2 instances
- Custom domain: Free

## App Spec Reference

The `.do/app.yaml` file defines the complete app configuration:

```yaml
name: line-chat-summarizer
region: sgp  # Singapore

services:
  - name: backend
    source_dir: apps/backend
    dockerfile_path: apps/backend/Dockerfile
    routes:
      - path: /api
    ...

  - name: web
    source_dir: apps/web
    dockerfile_path: apps/web/Dockerfile
    routes:
      - path: /
    ...
```

See `.do/app.yaml` for the complete configuration.
