# LINE Chat Summarizer AI

An intelligent chat summarization system for LINE Official Accounts using Google Gemini AI. Automatically captures chat conversations and generates comprehensive summaries with insights.

## 🚀 Features

- **Real-time Chat Capture**: Automatically captures messages from LINE Official Account
- **AI-Powered Summarization**: Uses Google Gemini 1.5 Pro for intelligent conversation analysis
- **Multi-Room Support**: Handles individual chats and group conversations separately
- **Session Management**: Auto-closes sessions after 50 messages or 24 hours
- **Rich Analytics**: Sentiment analysis, topic extraction, and action item identification
- **Dashboard Interface**: Web interface for viewing sessions and summaries
- **Audit Trail**: Complete conversation history with timestamps

## 🏗️ Architecture

Built on the foundation of a proven LINE integration system with:
- **Backend**: Node.js + Express + MongoDB
- **Frontend**: Next.js + TailwindCSS
- **AI Integration**: Google Gemini API
- **Database**: MongoDB with GridFS for file storage
- **Authentication**: JWT-based with role management

## 📋 Prerequisites

- Node.js 16+ and npm 8+
- MongoDB 5.0+ (local or Atlas)
- LINE Official Account
- Google Cloud account (for Gemini API)
- ngrok (for local development)

## 🛠️ Quick Setup

### 1. Clone and Install

```bash
# Clone the repository
git clone <repository-url>
cd line_chat_summarizer_ai

# Install all dependencies
npm run install:all
```

### 2. Environment Configuration

```bash
# Copy environment template
cp .env.example .env.local

# Edit with your credentials
nano .env.local
```

Required environment variables:
```env
# Database
MONGODB_URI=mongodb://localhost:27017/line_chat_summarizer

# LINE Official Account
LINE_CHANNEL_ID=your_channel_id
LINE_CHANNEL_SECRET=your_channel_secret
LINE_CHANNEL_ACCESS_TOKEN=your_access_token

# Google Gemini AI
GEMINI_API_KEY=your_gemini_api_key

# Security
ENCRYPTION_KEY=your_32_character_encryption_key
```

### 3. Database Setup

```bash
# Start MongoDB (if running locally)
mongod

# Create initial owner account
npm run seed
```

### 4. LINE Official Account Setup

1. Create a LINE Official Account at [LINE Developers](https://developers.line.biz/)
2. Create a Messaging API channel
3. Get your Channel ID, Channel Secret, and Access Token
4. Set webhook URL to: `https://your-domain.com/webhook/line`

### 5. Google Gemini API Setup

1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Create a new API key
3. Add the key to your environment variables

### 6. Start the Application

```bash
# Development mode (starts both backend and frontend)
npm run dev

# Backend only
npm run dev:backend

# Frontend only
npm run dev:web
```

The application will be available at:
- Frontend: http://localhost:3000
- Backend: http://localhost:3001

## 🔧 Development Setup

### Local Development with ngrok

For LINE webhook testing:

```bash
# Install ngrok
npm install -g ngrok

# Expose backend port
ngrok http 3001

# Use the ngrok URL for LINE webhook
# Example: https://abc123.ngrok.io/webhook/line
```

### Database Models

The system uses 5 main MongoDB collections:

1. **owners** - LINE OA account owners
2. **rooms** - Chat rooms/groups
3. **chat_sessions** - Conversation sessions (50 messages or 24 hours)
4. **summaries** - AI-generated summaries
5. **line_events_raw** - Raw LINE events for audit

### Project Structure

```
line_chat_summarizer_ai/
├── backend/           # Express.js API server
│   ├── src/
│   │   ├── models/    # MongoDB models
│   │   ├── handlers/  # LINE webhook handlers
│   │   ├── services/  # Business logic (Gemini AI)
│   │   └── routes/    # API routes
├── web/               # Next.js frontend
│   ├── app/           # App router pages
│   ├── components/    # React components
│   └── lib/           # Utilities
└── docs/              # Documentation
```

## 📖 Usage

### Basic Flow

1. **Message Reception**: LINE sends webhook events to `/webhook/line`
2. **Room Management**: System creates/finds appropriate chat room
3. **Session Tracking**: Messages are grouped into sessions
4. **Auto Summarization**: When session closes (50 msgs or 24hrs), Gemini generates summary
5. **Dashboard Access**: View conversations and summaries via web interface

### Chat Session Lifecycle

```
New Message → Find/Create Room → Find/Create Session → Add Message → Check Limits → Close & Summarize
```

### API Endpoints

- `POST /webhook/line` - LINE webhook receiver
- `GET /api/sessions` - Get chat sessions
- `GET /api/summaries` - Get AI summaries
- `GET /api/rooms` - Get chat rooms
- `POST /api/test-gemini` - Test Gemini connection

## 🤖 AI Features

### Gemini Analysis Provides:

- **Summary**: Comprehensive conversation overview
- **Key Topics**: Main discussion points
- **Sentiment**: Overall conversation tone (positive/neutral/negative)
- **Urgency**: Priority level (low/medium/high)
- **Action Items**: Tasks or follow-ups mentioned
- **Category**: Conversation classification
- **Participants**: Engagement analysis

### Example Summary Output:

```json
{
  "summary": "Customer inquired about product availability and pricing...",
  "key_topics": ["product inquiry", "pricing", "availability"],
  "sentiment": "positive",
  "urgency": "medium",
  "action_items": ["Check stock levels", "Provide quote"],
  "category": "customer_support"
}
```

## 🚀 Deployment

### Railway Deployment

```bash
# Using included Railway scripts
./railway-deploy-both-services.sh

# Or deploy individually
cd backend && railway up
cd web && railway up
```

### Environment Variables for Production

Set these in your deployment platform:
- All variables from `.env.example`
- Set `NODE_ENV=production`
- Use MongoDB Atlas URI for `MONGODB_URI`
- Set proper `WEBHOOK_URL` for your domain

## 🧪 Testing

```bash
# Backend tests
cd backend && npm test

# Test Gemini connection
curl -X POST http://localhost:3001/api/test-gemini

# Test LINE webhook (with proper signature)
curl -X POST http://localhost:3001/webhook/line \\
  -H "Content-Type: application/json" \\
  -H "X-Line-Signature: your-signature" \\
  -d '{"events": [...]}'
```

## 📊 Monitoring

### Logs

- Backend logs conversation processing
- Gemini API usage and costs
- LINE webhook events
- Database operations

### Metrics

- Total messages processed
- Sessions created/closed
- Summaries generated
- Gemini token usage
- Processing times

## 🔒 Security

- LINE webhook signature validation
- Encrypted storage of LINE credentials
- JWT-based authentication
- Role-based access control
- Audit logging of all events

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

- Check [Issues](https://github.com/your-repo/issues) for common problems
- Review LINE Developers documentation
- Check Google Gemini API documentation
- Ensure all environment variables are set correctly

## 🔗 Links

- [LINE Developers](https://developers.line.biz/)
- [Google Gemini API](https://ai.google.dev/)
- [MongoDB Atlas](https://www.mongodb.com/atlas)
- [Railway Deployment](https://railway.app/)

---

**Built with ❤️ using LINE Messaging API and Google Gemini AI**