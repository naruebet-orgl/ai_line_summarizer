# Railway Deployment Guide

This guide explains how to deploy the LINE Chat Summarizer AI to Railway.

## Architecture

The application consists of two services:
- **Backend**: Node.js API server (port 3001 locally)
- **Frontend**: Next.js web application (port 3000 locally)

## Deployment Steps

### 1. Deploy Backend Service

1. Create a new Railway project
2. Connect your GitHub repository
3. Add a new service from the `backend/` directory
4. Set the following environment variables in Railway dashboard:

```
NODE_ENV=production
PORT=$PORT
MONGODB_URI=<your-mongodb-connection-string>
MONGODB_DB_NAME=line_chat_summarizer
LINE_CHANNEL_ID=<your-line-channel-id>
LINE_CHANNEL_SECRET=<your-line-channel-secret>
LINE_CHANNEL_ACCESS_TOKEN=<your-line-channel-access-token>
GEMINI_API_KEY=<your-gemini-api-key>
BACKEND_URL=https://$RAILWAY_PUBLIC_DOMAIN
FRONTEND_URL=https://your-frontend-domain.railway.app
CORS_ORIGIN=https://your-frontend-domain.railway.app
```

5. Note the backend service domain (e.g., `backend-production-xxxx.up.railway.app`)

### 2. Deploy Frontend Service

1. Add another service from the `web/` directory
2. Set the following environment variables:

```
NODE_ENV=production
PORT=$PORT
BACKEND_URL=https://your-backend-domain.railway.app
BETTER_AUTH_URL=https://$RAILWAY_PUBLIC_DOMAIN
FRONTEND_URL=https://$RAILWAY_PUBLIC_DOMAIN
NEXTAUTH_URL=https://$RAILWAY_PUBLIC_DOMAIN
MONGODB_URI=<your-mongodb-connection-string>
MONGODB_DB_NAME=line_chat_summarizer
LINE_CHANNEL_SECRET=<your-line-channel-secret>
LINE_CHANNEL_ACCESS_TOKEN=<your-line-channel-access-token>
BETTER_AUTH_SECRET=<generate-secure-random-string>
NEXTAUTH_SECRET=<generate-secure-random-string>
JWT_SECRET=<generate-secure-random-string>
SESSION_SECRET=<generate-secure-random-string>
GEMINI_API_KEY=<your-gemini-api-key>
```

### 3. Update Cross-References

After both services are deployed:

1. Update the frontend's `BACKEND_URL` to point to your backend service domain
2. Update the backend's `FRONTEND_URL` and `CORS_ORIGIN` to point to your frontend service domain

### 4. Health Checks

The application includes health check endpoints:
- Backend: `https://your-backend-domain.railway.app/health`
- Backend LINE health: `https://your-backend-domain.railway.app/api/line/health`

### 5. LINE Webhook Configuration

Update your LINE Bot webhook URL to:
```
https://your-backend-domain.railway.app/api/line/webhook
```

## Troubleshooting

### Frontend 500 Errors
- Check that `BACKEND_URL` is correctly set to your backend service domain
- Verify backend is running and accessible via health check

### CORS Errors
- Ensure `CORS_ORIGIN` in backend matches your frontend domain exactly
- Check that both services have HTTPS URLs

### Database Connection Issues
- Verify `MONGODB_URI` is identical in both services
- Check MongoDB Atlas IP whitelist includes `0.0.0.0/0` for Railway

### LINE Bot Issues
- Verify LINE webhook URL points to backend service
- Check LINE credentials are correctly set in backend environment variables

## Configuration Files

Each service has its own `railway.toml` configuration:

**backend/railway.toml**:
```toml
[build]
builder = "NIXPACKS"

[deploy]
startCommand = "npm start"

[variables]
NODE_ENV = "production"
PORT = "$PORT"
```

**web/railway.toml**:
```toml
[build]
builder = "NIXPACKS"

[deploy]
startCommand = "npm start"

[variables]
NODE_ENV = "production"
PORT = "$PORT"
```