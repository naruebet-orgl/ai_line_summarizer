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
MONGODB_URI=mongodb+srv://ai_db_user:jiMPUDBcadm9jsK9@aisummarizer.ka0psxc.mongodb.net/line_chat_summarizer?retryWrites=true&w=majority&appName=aisummarizer
MONGODB_DB_NAME=line_chat_summarizer
LINE_CHANNEL_ID=2008126969
LINE_CHANNEL_SECRET=18289c53b438f37f0a37d04c8014acb2
LINE_CHANNEL_ACCESS_TOKEN=V9Hqv/KC+9GPS0lx4vHsN5/+rFbjxjmB0vKQ3BLP+UdzWYTnpcpRZrDxWeh8cBPLX87rbIEUBYzTu/rn1pxqEXWdySS7wjYScR7Wmf1PS5r/v/oj/Q5JkMvUU9yzCk4KYZnMITvIO++QEbCTbPRZ8gdB04t89/1O/w1cDnyilFU=
GEMINI_API_KEY=AIzaSyDS5WP9J_4XeRYe1amYXwh5UL6H8xbx1bQ
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
MONGODB_URI=mongodb+srv://ai_db_user:jiMPUDBcadm9jsK9@aisummarizer.ka0psxc.mongodb.net/line_chat_summarizer?retryWrites=true&w=majority&appName=aisummarizer
MONGODB_DB_NAME=line_chat_summarizer
LINE_CHANNEL_SECRET=18289c53b438f37f0a37d04c8014acb2
LINE_CHANNEL_ACCESS_TOKEN=V9Hqv/KC+9GPS0lx4vHsN5/+rFbjxjmB0vKQ3BLP+UdzWYTnpcpRZrDxWeh8cBPLX87rbIEUBYzTu/rn1pxqEXWdySS7wjYScR7Wmf1PS5r/v/oj/Q5JkMvUU9yzCk4KYZnMITvIO++QEbCTbPRZ8gdB04t89/1O/w1cDnyilFU=
BETTER_AUTH_SECRET=line-chat-summarizer-auth-secret-2024
NEXTAUTH_SECRET=line-chat-summarizer-nextauth-secret-2024
JWT_SECRET=line-chat-summarizer-jwt-secret-2024
SESSION_SECRET=line-chat-summarizer-session-secret-2024
GEMINI_API_KEY=AIzaSyDS5WP9J_4XeRYe1amYXwh5UL6H8xbx1bQ
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