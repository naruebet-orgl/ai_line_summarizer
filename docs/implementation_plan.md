# LINE Chat Summarizer AI - Implementation Plan & Design Document

## 1. Executive Summary

The LINE Chat Summarizer AI is a web application that connects to LINE Official Account (OA) to read, process, and summarize chat conversations using AI, providing insights and summaries for business analysis. This document outlines the implementation plan, system architecture, and technical design aligned with the Product Requirements Document.

### Key Features
- LINE Official Account webhook integration for real-time message capture
- Multimodal AI summarization using Google Gemini API (text + images)
- Secure multi-provider authentication with NextAuth.js
- Role-based access control (Admin, Analyst, Viewer)
- Session-based conversation management (50 messages OR 24 hours)
- MongoDB GridFS for image storage and management
- Real-time updates via tRPC subscriptions
- Responsive dashboard with image gallery and analytics

## 2. System Architecture

### 2.1 High-Level Architecture

```
┌─────────────┐     ┌──────────────┐     ┌──────────────┐
│   LINE OA   │────▶│   Express    │────▶│   MongoDB    │
│   Platform  │     │   Webhook    │     │   GridFS     │
└─────────────┘     └──────────────┘     └──────────────┘
                           │                      │
                           ▼                      ▼
┌─────────────┐     ┌──────────────┐     ┌──────────────┐
│  Next.js    │◀────│    tRPC      │◀────│   Session    │
│  Dashboard  │     │   API Layer  │     │   Manager    │
└─────────────┘     └──────────────┘     └──────────────┘
                           │                      │
                           ▼                      ▼
┌─────────────┐     ┌──────────────┐     ┌──────────────┐
│  NextAuth   │────▶│   Gemini     │◀────│   Message    │
│  Auth Layer │     │   AI API     │     │   Processor  │
└─────────────┘     └──────────────┘     └──────────────┘
```

### 2.2 Component Details

#### 2.2.1 LINE Webhook Receiver
- **Technology**: Express.js
- **Responsibilities**:
  - Receive LINE Official Account webhook events
  - Validate webhook signatures
  - Parse text and image messages
  - Download images from LINE CDN
  - Store messages in MongoDB

#### 2.2.2 MongoDB with GridFS
- **Technology**: MongoDB + GridFS
- **Purpose**: Store messages, sessions, and image files
- **Collections**:
  - Users collection
  - Sessions collection
  - Messages collection
  - Summaries collection
  - GridFS for image storage

#### 2.2.3 Session Manager
- **Responsibilities**:
  - Track conversation sessions (50 messages OR 24 hours)
  - Auto-close sessions based on triggers
  - Create new sessions automatically
  - Track message and image counts

#### 2.2.4 Google Gemini AI
- **Technology**: Google Gemini API (gemini-1.5-pro, gemini-1.5-flash)
- **Features**:
  - Multimodal analysis (text + images)
  - Context-aware summarization
  - Image content analysis
  - Sentiment analysis
  - Action item extraction

#### 2.2.5 tRPC API Layer
- **Technology**: tRPC with TypeScript
- **Features**:
  - Type-safe API endpoints
  - Real-time subscriptions
  - Role-based middleware
  - Input validation

#### 2.2.6 Next.js Frontend
- **Technology**: Next.js 14 + Tailwind CSS
- **Features**:
  - Server-side rendering
  - Protected routes
  - Responsive design
  - Image gallery with lightbox
  - Real-time updates

#### 2.2.7 NextAuth.js Authentication
- **Providers**: Google, GitHub, Email/Password, LINE Login
- **Features**:
  - JWT session management
  - Role-based access control
  - CSRF protection
  - Secure cookies

## 3. Technical Specifications

### 3.1 Technology Stack (Aligned with PRD)

#### Frontend
- **Framework**: Next.js 14+ with App Router
- **Styling**: Tailwind CSS
- **UI Components**: shadcn/ui or Radix UI
- **State Management**: Zustand or React Context
- **Forms**: React Hook Form + Zod validation

#### Backend
- **Runtime**: Node.js 20+
- **Framework**: Express.js for webhooks
- **API Layer**: tRPC for type-safe APIs
- **Database**: MongoDB with Mongoose ODM
- **File Storage**: MongoDB GridFS for images
- **Session Cache**: Redis (optional)

#### Authentication
- **Library**: NextAuth.js (Auth.js v5)
- **Providers**: Google, GitHub, Credentials, LINE Login
- **Session**: JWT with database adapter
- **Security**: CSRF tokens, rate limiting

#### AI/ML
- **Primary AI**: Google Gemini 1.5 Pro (multimodal)
- **Image Analysis**: Gemini 1.5 Flash (faster for images)
- **API Client**: @google/generative-ai SDK
- **Fallback**: Manual summarization option

#### Infrastructure
- **Container**: Docker + Docker Compose
- **Deployment**: Vercel (Next.js) + Railway/Render (Express)
- **CDN**: Cloudflare or Vercel Edge Network
- **Monitoring**: Vercel Analytics + Sentry
- **Logging**: Winston + MongoDB logs collection

### 3.2 API Specifications

#### Express Routes (Webhook)
```
POST /webhook/line          # LINE webhook for incoming messages
GET  /api/images/:gridfsId  # Direct image serving (fallback)
```

#### tRPC Routes (Main API)
```typescript
// Authentication & Authorization
auth.login               # Handle OAuth providers
auth.logout              # Secure logout
auth.getSession          # Get current user session
auth.checkPermissions    # Role-based access control

// Sessions (Role-protected)
sessions.getAll          # Get all sessions with pagination
sessions.getById         # Get specific session with messages
sessions.close           # Manually close session (Analyst+)
sessions.summarize       # Generate AI summary (Analyst+)
sessions.delete          # Delete session (Admin only)

// Messages
messages.getBySession    # Get messages for session
messages.create          # Create new message (internal)
messages.analyzeImage    # Gemini image analysis

// Images
images.getById           # Get image metadata
images.getFile           # Serve image file from GridFS
images.getThumbnail      # Get optimized thumbnail
images.getBySession      # Get all images from session
images.download          # Download original image
images.analyze           # Gemini Vision API analysis

// Users
users.getById            # Get user details
users.getChatHistory     # Get user's complete chat history
users.getImageGallery    # Get user's uploaded images
users.updateProfile      # Update user profile

// Analytics (Role-protected)
analytics.getSessionStats    # Session statistics
analytics.getImageStats      # Image upload statistics
analytics.getUserActivity    # User activity metrics
analytics.getAIUsage         # Gemini API usage stats (Admin only)

// AI & Gemini
ai.summarizeSession      # Generate summary with Gemini
ai.analyzeImages         # Batch image analysis
ai.generateInsights      # Advanced AI insights
ai.testConnection        # Test Gemini API connection (Admin only)

// Admin
admin.getUsers           # Get all users (Admin only)
admin.updateUserRole     # Update user roles (Admin only)
admin.getSystemStats     # System statistics (Admin only)
```

### 3.3 Database Schema (MongoDB)

```typescript
// User Collection
interface User {
  _id: ObjectId;
  lineUserId: string;
  displayName: string;
  pictureUrl?: string;
  role: 'admin' | 'analyst' | 'viewer';
  email?: string;
  createdAt: Date;
  lastActive: Date;
}

// Session Collection
interface Session {
  _id: ObjectId;
  userId: string;
  status: 'active' | 'closed';
  startTime: Date;
  endTime?: Date;
  messageCount: number;
  imageCount: number;
  hasImages: boolean;
  summary?: ObjectId; // Reference to Summary
  createdAt: Date;
  updatedAt: Date;
}

// Message Collection
interface Message {
  _id: ObjectId;
  sessionId: ObjectId;
  userId: string;
  lineMessageId: string;
  messageType: 'text' | 'image' | 'sticker' | 'audio' | 'video';
  content?: string;
  imageData?: {
    gridFSId: ObjectId;
    originalUrl: string;
    previewUrl: string;
    fileName: string;
    fileSize: number;
    mimeType: string;
    thumbnailGridFSId?: ObjectId;
    geminiAnalysis?: {
      description: string;
      analyzedAt: Date;
    };
  };
  timestamp: Date;
  createdAt: Date;
}

// Summary Collection
interface Summary {
  _id: ObjectId;
  sessionId: ObjectId;
  aiSummary: string;
  keyTopics: string[];
  sentiment: 'positive' | 'neutral' | 'negative';
  actionItems: string[];
  imageInsights?: string[];
  geminiModel: string;
  tokensUsed: number;
  createdAt: Date;
}

// GridFS File Metadata
interface ImageFile {
  _id: ObjectId;
  filename: string;
  contentType: string;
  length: number;
  chunkSize: number;
  uploadDate: Date;
  metadata: {
    sessionId: ObjectId;
    userId: string;
    messageId: ObjectId;
    isThumbnail: boolean;
    originalImageId?: ObjectId;
  };
}

// NextAuth Collections (automatic)
- accounts
- sessions (auth sessions)
- users (auth users)
- verificationTokens
```

## 4. Implementation Phases (Aligned with PRD MVP)

### Phase 1: Foundation (Weeks 1-2) ✅
- [x] MongoDB setup with GridFS
- [x] NextAuth.js setup with Google/GitHub providers
- [x] tRPC setup with authentication middleware
- [x] LINE webhook integration
- [x] Text message storage
- [x] Basic role-based access control
- [x] Simple session management (50 msgs OR 24hrs)
- [x] Protected dashboard with login

### Phase 2: Core Features (Weeks 3-4) ✅
- [x] Image download and storage pipeline
- [x] Gemini AI integration for text summarization
- [x] Basic image gallery and viewer
- [x] User management (Admin features)
- [x] Enhanced UI with filters and search

### Phase 3: Advanced Features (Weeks 5-6) ✅
- [x] Gemini Vision API for image analysis
- [x] Auto-summarization on session close
- [x] Advanced authentication features
- [x] Image optimization and thumbnails
- [x] Export functionality with AI insights

### Phase 4: Production Ready (Weeks 7-8) ✅
- [x] Advanced analytics with AI usage tracking
- [x] Performance optimization
- [x] Security hardening
- [x] Production deployment

## 5. Security Considerations

### 5.1 Authentication & Authorization
- NextAuth.js multi-provider authentication
- JWT tokens with secure httpOnly cookies
- Role-based access control (Admin, Analyst, Viewer)
- LINE webhook signature validation
- API rate limiting with express-rate-limit

### 5.2 Data Protection
- MongoDB encryption at rest
- TLS 1.3 for all connections
- Secure image storage in GridFS
- Session data isolation
- GDPR/privacy compliance

### 5.3 Security Best Practices
- Input validation with Zod
- NoSQL injection prevention
- XSS protection with DOMPurify
- CSRF token validation
- Content Security Policy (CSP) headers
- Regular dependency updates
- Environment variable protection

## 6. Monitoring & Observability

### 6.1 Metrics
- Message processing rate
- Image upload success rate
- Gemini API response times
- Session creation/closure rates
- Token usage and costs
- Authentication success/failure rates

### 6.2 Logging
- Winston logger with MongoDB transport
- Structured JSON logs
- Request/response logging
- Gemini API call logs
- Authentication audit logs
- Image processing logs

### 6.3 Alerting
- Gemini API quota warnings
- Failed image downloads
- Session overflow alerts
- Authentication anomalies
- Database connection issues
- High error rate alerts

## 7. Frontend & Authentication Implementation

### 7.1 NextAuth.js Configuration
```typescript
// app/api/auth/[...nextauth]/route.ts
import NextAuth from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'
import GitHubProvider from 'next-auth/providers/github'
import CredentialsProvider from 'next-auth/providers/credentials'
import { MongoDBAdapter } from "@auth/mongodb-adapter"

export const authOptions = {
  adapter: MongoDBAdapter(clientPromise),
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    GitHubProvider({
      clientId: process.env.GITHUB_ID!,
      clientSecret: process.env.GITHUB_SECRET!,
    }),
    // LINE Login Provider
    {
      id: "line",
      name: "LINE",
      type: "oauth",
      authorization: {
        url: "https://access.line.me/oauth2/v2.1/authorize",
        params: {
          scope: "profile openid email",
          bot_prompt: "aggressive",
        },
      },
      token: "https://api.line.me/oauth2/v2.1/token",
      userinfo: "https://api.line.me/v2/profile",
      profile(profile) {
        return {
          id: profile.userId,
          name: profile.displayName,
          email: profile.email,
          image: profile.pictureUrl,
        }
      },
    },
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role || 'viewer'
      }
      return token
    },
    async session({ session, token }) {
      session.user.role = token.role
      return session
    },
  },
  pages: {
    signIn: '/auth/signin',
    error: '/auth/error',
  },
}
```

### 7.2 Frontend Components Structure
```
app/
├── (auth)/
│   ├── signin/
│   │   └── page.tsx         # Multi-provider login page
│   └── layout.tsx           # Auth layout
├── (dashboard)/
│   ├── layout.tsx           # Protected dashboard layout
│   ├── page.tsx             # Dashboard home
│   ├── sessions/
│   │   ├── page.tsx         # Sessions list
│   │   └── [id]/
│   │       └── page.tsx     # Session detail with chat
│   ├── users/
│   │   ├── page.tsx         # User management (Admin)
│   │   └── [id]/
│   │       └── page.tsx     # User detail with gallery
│   ├── analytics/
│   │   └── page.tsx         # Analytics dashboard
│   └── settings/
│       └── page.tsx         # Settings page
├── api/
│   ├── auth/[...nextauth]/
│   ├── trpc/[trpc]/
│   └── webhook/line/
components/
├── auth/
│   ├── LoginForm.tsx
│   ├── ProviderButtons.tsx
│   └── RoleGuard.tsx
├── dashboard/
│   ├── Sidebar.tsx
│   ├── Header.tsx
│   └── StatsCards.tsx
├── sessions/
│   ├── SessionList.tsx
│   ├── SessionCard.tsx
│   ├── ChatViewer.tsx
│   └── MessageBubble.tsx
├── images/
│   ├── ImageGallery.tsx
│   ├── ImageLightbox.tsx
│   ├── ImageCard.tsx
│   └── GeminiAnalysis.tsx
└── ui/
    ├── Button.tsx
    ├── Card.tsx
    ├── Modal.tsx
    └── LoadingSpinner.tsx
```

### 7.3 Protected Routes & Role-Based Access
```typescript
// middleware.ts
import { withAuth } from "next-auth/middleware"

export default withAuth({
  callbacks: {
    authorized: ({ req, token }) => {
      const path = req.nextUrl.pathname

      // Admin-only routes
      if (path.startsWith('/users') || path.startsWith('/settings')) {
        return token?.role === 'admin'
      }

      // Analyst and Admin routes
      if (path.startsWith('/sessions/') && req.method !== 'GET') {
        return token?.role === 'admin' || token?.role === 'analyst'
      }

      // All authenticated users
      return !!token
    },
  },
})

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)']
}
```

### 7.4 Real-time Updates with tRPC Subscriptions
```typescript
// Real-time session updates
const { data: session } = api.sessions.subscribe.useSubscription(
  { sessionId },
  {
    onData: (data) => {
      // Update UI with new messages
      setMessages(prev => [...prev, data.message])
    },
  }
)

// Image upload progress
const { data: progress } = api.images.uploadProgress.useSubscription(
  { uploadId },
  {
    onData: ({ progress, status }) => {
      setUploadProgress(progress)
      if (status === 'complete') {
        refetchImages()
      }
    },
  }
)
```

## 8. Gemini AI Integration

### 8.1 Gemini Configuration
```typescript
// lib/gemini.ts
import { GoogleGenerativeAI } from '@google/generative-ai'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)

// Model selection based on use case
export const models = {
  text: genAI.getGenerativeModel({ model: "gemini-1.5-pro" }),
  vision: genAI.getGenerativeModel({ model: "gemini-1.5-flash" }),
  multimodal: genAI.getGenerativeModel({ model: "gemini-1.5-pro" }),
}
```

### 8.2 Session Summarization with Multimodal Analysis
```typescript
async function summarizeSession(sessionId: string) {
  const session = await Session.findById(sessionId)
  const messages = await Message.find({ sessionId })

  // Prepare multimodal content
  const parts = []

  // Add text context
  parts.push({
    text: `Analyze this customer service conversation and provide:\n
    1. Summary of the conversation\n
    2. Key topics discussed\n
    3. Customer sentiment\n
    4. Action items\n
    5. Any images shared and their relevance\n\n
    Conversation:`
  })

  // Add messages and images
  for (const msg of messages) {
    if (msg.messageType === 'text') {
      parts.push({ text: `${msg.timestamp}: ${msg.content}` })
    } else if (msg.messageType === 'image' && msg.imageData) {
      // Fetch image from GridFS
      const imageBuffer = await getImageFromGridFS(msg.imageData.gridFSId)
      parts.push({
        inlineData: {
          data: imageBuffer.toString('base64'),
          mimeType: msg.imageData.mimeType
        }
      })
    }
  }

  // Generate summary
  const result = await models.multimodal.generateContent(parts)
  const summary = result.response.text()

  // Parse and save summary
  const summaryDoc = await Summary.create({
    sessionId,
    aiSummary: summary,
    geminiModel: 'gemini-1.5-pro',
    tokensUsed: result.response.usageMetadata?.totalTokenCount,
    // Parse key topics, sentiment, etc. from response
  })

  return summaryDoc
}
```

### 8.3 Image Analysis Pipeline
```typescript
async function analyzeImage(messageId: string) {
  const message = await Message.findById(messageId)
  if (!message.imageData) return

  // Fetch image from GridFS
  const imageBuffer = await getImageFromGridFS(message.imageData.gridFSId)

  // Analyze with Gemini Vision
  const prompt = `
    Analyze this image and provide:
    1. Detailed description of what's shown
    2. Any text visible in the image (OCR)
    3. Context relevance for customer service
    4. Potential issues or requests shown
    5. Suggested responses or actions
  `

  const result = await models.vision.generateContent([
    prompt,
    {
      inlineData: {
        data: imageBuffer.toString('base64'),
        mimeType: message.imageData.mimeType
      }
    }
  ])

  // Save analysis
  message.imageData.geminiAnalysis = {
    description: result.response.text(),
    analyzedAt: new Date()
  }
  await message.save()

  return message.imageData.geminiAnalysis
}
```

### 8.4 Prompt Templates
```typescript
// Prompt templates for different scenarios
const prompts = {
  summarization: {
    brief: "Provide a brief 2-3 sentence summary",
    detailed: "Provide a comprehensive summary with all details",
    bulletPoints: "Summarize in bullet points",
  },
  sentiment: {
    analysis: "Analyze the customer's emotional state and satisfaction level",
    trend: "Track sentiment changes throughout the conversation",
  },
  actionItems: {
    extract: "List all action items and follow-ups needed",
    priority: "Categorize action items by priority (high/medium/low)",
  },
  imageContext: {
    product: "Identify products in the image and related issues",
    document: "Extract and summarize text from documents",
    screenshot: "Analyze UI issues or errors shown",
  },
}
```

## 9. Image Processing Pipeline

### 9.1 Image Download from LINE
```typescript
async function downloadLineImage(messageId: string, userId: string) {
  // Get image content from LINE
  const response = await axios.get(
    `https://api-data.line.me/v2/bot/message/${messageId}/content`,
    {
      headers: {
        'Authorization': `Bearer ${process.env.LINE_CHANNEL_ACCESS_TOKEN}`
      },
      responseType: 'arraybuffer'
    }
  )

  const buffer = Buffer.from(response.data)
  const mimeType = response.headers['content-type']

  // Validate image
  if (!['image/jpeg', 'image/png', 'image/gif'].includes(mimeType)) {
    throw new Error('Unsupported image type')
  }

  if (buffer.length > 10 * 1024 * 1024) { // 10MB limit
    throw new Error('Image too large')
  }

  return { buffer, mimeType }
}
```

### 9.2 GridFS Storage
```typescript
async function saveImageToGridFS(
  buffer: Buffer,
  metadata: ImageMetadata
): Promise<ObjectId> {
  const bucket = new GridFSBucket(mongoose.connection.db, {
    bucketName: 'images'
  })

  const uploadStream = bucket.openUploadStream(
    `${metadata.sessionId}_${Date.now()}.jpg`,
    {
      metadata: {
        sessionId: metadata.sessionId,
        userId: metadata.userId,
        messageId: metadata.messageId,
        isThumbnail: false,
      }
    }
  )

  return new Promise((resolve, reject) => {
    uploadStream.on('finish', () => resolve(uploadStream.id))
    uploadStream.on('error', reject)
    uploadStream.end(buffer)
  })
}
```

### 9.3 Thumbnail Generation
```typescript
import sharp from 'sharp'

async function generateThumbnail(
  originalBuffer: Buffer,
  originalId: ObjectId
): Promise<ObjectId> {
  // Generate thumbnail
  const thumbnail = await sharp(originalBuffer)
    .resize(300, 300, {
      fit: 'inside',
      withoutEnlargement: true
    })
    .jpeg({ quality: 80 })
    .toBuffer()

  // Save thumbnail to GridFS
  return saveImageToGridFS(thumbnail, {
    isThumbnail: true,
    originalImageId: originalId,
  })
}
```

### 9.4 Image Serving
```typescript
// tRPC endpoint for serving images
export const imageRouter = router({
  getFile: protectedProcedure
    .input(z.object({ gridFsId: z.string() }))
    .query(async ({ input }) => {
      const bucket = new GridFSBucket(mongoose.connection.db, {
        bucketName: 'images'
      })

      const downloadStream = bucket.openDownloadStream(
        new ObjectId(input.gridFsId)
      )

      const chunks: Buffer[] = []
      return new Promise((resolve, reject) => {
        downloadStream.on('data', (chunk) => chunks.push(chunk))
        downloadStream.on('end', () => {
          const buffer = Buffer.concat(chunks)
          resolve({
            data: buffer.toString('base64'),
            mimeType: downloadStream.file.metadata.mimeType,
          })
        })
        downloadStream.on('error', reject)
      })
    }),
})
```

## 10. Deployment Strategy

### 10.1 Development Environment
```yaml
# docker-compose.yml
version: '3.8'
services:
  mongodb:
    image: mongo:7.0
    ports:
      - "27017:27017"
    volumes:
      - mongo_data:/data/db
    environment:
      MONGO_INITDB_ROOT_USERNAME: admin
      MONGO_INITDB_ROOT_PASSWORD: password

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

  app:
    build: .
    ports:
      - "3000:3000"  # Next.js
      - "4000:4000"  # Express
    environment:
      - DATABASE_URL=mongodb://admin:password@mongodb:27017
      - REDIS_URL=redis://redis:6379
      - NEXTAUTH_URL=http://localhost:3000
    volumes:
      - .:/app
    depends_on:
      - mongodb
      - redis

volumes:
  mongo_data:
```

### 10.2 Production Deployment
```yaml
# Vercel deployment for Next.js
vercel.json:
{
  "buildCommand": "npm run build",
  "outputDirectory": ".next",
  "env": {
    "MONGODB_URI": "@mongodb_uri",
    "NEXTAUTH_SECRET": "@nextauth_secret",
    "GEMINI_API_KEY": "@gemini_api_key"
  }
}

# Railway/Render for Express webhook
Dockerfile:
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 4000
CMD ["node", "server.js"]
```

### 10.3 Environment Variables
```bash
# .env.local
# Database
MONGODB_URI=mongodb+srv://...

# Authentication
NEXTAUTH_URL=https://your-app.vercel.app
NEXTAUTH_SECRET=your-secret-key

# OAuth Providers
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GITHUB_ID=...
GITHUB_SECRET=...

# LINE Integration
LINE_CHANNEL_ACCESS_TOKEN=...
LINE_CHANNEL_SECRET=...
LINE_LOGIN_CHANNEL_ID=...
LINE_LOGIN_CHANNEL_SECRET=...

# Google Gemini
GEMINI_API_KEY=...

# Redis (optional)
REDIS_URL=redis://...
```

## 11. Success Metrics (PRD Aligned)

### 11.1 Technical Metrics
- Successfully capture 100% of LINE messages and images
- Store images with 99.9% reliability
- Generate summaries within 30 seconds using Gemini
- Dashboard loads in <2 seconds
- Image gallery loads in <3 seconds
- Zero message/image loss during processing
- Support images up to 10MB per file
- Authentication flow completes in <5 seconds
- Role-based access control works 100% reliably
- Gemini API response time <10 seconds for image analysis

### 11.2 Business Metrics
- User adoption rate >80% in first month
- Session completion rate >95%
- AI summary accuracy >90% (based on user feedback)
- Cost per session <$0.10 (Gemini API costs)
- Daily active users growth 20% month-over-month

## 12. Testing Strategy

### 12.1 Unit Tests
```typescript
// Example test for session management
describe('SessionManager', () => {
  it('should auto-close session after 50 messages', async () => {
    const session = await createSession(userId)

    // Add 50 messages
    for (let i = 0; i < 50; i++) {
      await addMessage(session._id, { content: `Message ${i}` })
    }

    const updatedSession = await Session.findById(session._id)
    expect(updatedSession.status).toBe('closed')
    expect(updatedSession.messageCount).toBe(50)
  })

  it('should auto-close session after 24 hours', async () => {
    const session = await createSession(userId)

    // Mock time passage
    jest.advanceTimersByTime(24 * 60 * 60 * 1000)

    await checkSessionTimeout()

    const updatedSession = await Session.findById(session._id)
    expect(updatedSession.status).toBe('closed')
  })
})
```

### 12.2 Integration Tests
```typescript
// LINE webhook integration test
describe('LINE Webhook', () => {
  it('should process text messages', async () => {
    const webhook = {
      events: [{
        type: 'message',
        message: { type: 'text', text: 'Hello' },
        source: { userId: 'U123' }
      }]
    }

    const response = await request(app)
      .post('/webhook/line')
      .send(webhook)
      .set('X-Line-Signature', generateSignature(webhook))

    expect(response.status).toBe(200)

    const message = await Message.findOne({ lineMessageId: webhook.events[0].message.id })
    expect(message.content).toBe('Hello')
  })
})
```

### 12.3 E2E Tests
```typescript
// Full flow test with Gemini
describe('E2E: Session Summarization', () => {
  it('should generate summary with images', async () => {
    // Create session with messages and images
    const session = await createTestSession()
    await addTestMessages(session._id, 10)
    await addTestImages(session._id, 2)

    // Close session and trigger summarization
    await closeSession(session._id)

    // Check summary generation
    const summary = await Summary.findOne({ sessionId: session._id })
    expect(summary).toBeDefined()
    expect(summary.aiSummary).toContain('key topics')
    expect(summary.imageInsights).toHaveLength(2)
  })
})
```

## 13. Implementation Code Examples

### 13.1 LINE Webhook Handler
```typescript
// server/webhook/line.ts
import { validateSignature } from '@line/bot-sdk'

export async function handleLineWebhook(req: Request) {
  // Validate signature
  const signature = req.headers['x-line-signature']
  if (!validateSignature(req.body, channelSecret, signature)) {
    return res.status(401).send('Invalid signature')
  }

  const { events } = req.body

  for (const event of events) {
    if (event.type === 'message') {
      const { userId } = event.source
      const { messageId, type } = event.message

      // Get or create session
      let session = await Session.findOne({
        userId,
        status: 'active'
      })

      if (!session) {
        session = await Session.create({ userId })
      }

      // Process based on message type
      if (type === 'text') {
        await Message.create({
          sessionId: session._id,
          userId,
          lineMessageId: messageId,
          messageType: 'text',
          content: event.message.text
        })
      } else if (type === 'image') {
        // Download and store image
        const { buffer, mimeType } = await downloadLineImage(messageId, userId)
        const gridFSId = await saveImageToGridFS(buffer, {
          sessionId: session._id,
          userId,
          messageId
        })

        await Message.create({
          sessionId: session._id,
          userId,
          lineMessageId: messageId,
          messageType: 'image',
          imageData: {
            gridFSId,
            originalUrl: event.message.originalContentUrl,
            previewUrl: event.message.previewImageUrl,
            fileSize: buffer.length,
            mimeType
          }
        })

        // Trigger async image analysis
        analyzeImage(messageId).catch(console.error)
      }

      // Update session
      session.messageCount++
      if (type === 'image') session.imageCount++
      await session.save()

      // Check session triggers
      if (session.messageCount >= 50 ||
          Date.now() - session.startTime > 24 * 60 * 60 * 1000) {
        await closeSessionAndSummarize(session._id)
      }
    }
  }

  return res.status(200).send('OK')
}
```

### 13.2 tRPC Router Setup
```typescript
// server/api/routers/index.ts
import { initTRPC } from '@trpc/server'
import { createContext } from '../context'

const t = initTRPC.context<typeof createContext>().create()

export const router = t.router
export const publicProcedure = t.procedure
export const protectedProcedure = t.procedure.use(authMiddleware)
export const adminProcedure = protectedProcedure.use(adminMiddleware)

export const appRouter = router({
  auth: authRouter,
  sessions: sessionRouter,
  messages: messageRouter,
  images: imageRouter,
  users: userRouter,
  analytics: analyticsRouter,
  ai: aiRouter,
  admin: adminRouter,
})

export type AppRouter = typeof appRouter
```

### 13.3 Frontend Session List Component
```tsx
// components/sessions/SessionList.tsx
import { api } from '@/lib/trpc'
import { SessionCard } from './SessionCard'

export function SessionList() {
  const { data: sessions, isLoading } = api.sessions.getAll.useQuery({
    limit: 20,
    includeImages: true
  })

  if (isLoading) return <LoadingSpinner />

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {sessions?.map((session) => (
        <SessionCard
          key={session._id}
          session={session}
          showImages={session.imageCount > 0}
          onSummarize={() => handleSummarize(session._id)}
        />
      ))}
    </div>
  )
}
```

## 14. Project Structure

```
line_chat_summarizer_ai/
├── app/                      # Next.js app directory
│   ├── (auth)/              # Auth pages
│   ├── (dashboard)/         # Dashboard pages
│   ├── api/                 # API routes
│   └── layout.tsx           # Root layout
├── components/              # React components
├── server/                  # Backend code
│   ├── api/                 # tRPC routers
│   ├── db/                  # Database models
│   ├── services/            # Business logic
│   └── webhook/             # LINE webhook
├── lib/                     # Shared utilities
│   ├── auth.ts              # NextAuth config
│   ├── gemini.ts            # Gemini AI client
│   ├── mongodb.ts           # MongoDB connection
│   └── trpc.ts              # tRPC client
├── public/                  # Static assets
├── styles/                  # Global styles
├── types/                   # TypeScript types
├── .env.local              # Environment variables
├── docker-compose.yml      # Docker setup
├── next.config.js          # Next.js config
├── package.json            # Dependencies
├── tailwind.config.js      # Tailwind config
└── tsconfig.json           # TypeScript config
```

## 15. Quick Start Guide

### 15.1 Prerequisites
- Node.js 20+
- MongoDB 7.0+
- LINE Official Account
- Google Cloud account (for Gemini API)
- GitHub/Google OAuth apps

### 15.2 Setup Instructions

```bash
# Clone repository
git clone https://github.com/your-org/line-chat-summarizer-ai
cd line-chat-summarizer-ai

# Install dependencies
npm install

# Setup environment variables
cp .env.example .env.local
# Edit .env.local with your credentials

# Run MongoDB with Docker
docker-compose up -d mongodb

# Run database setup
npm run db:setup

# Start development servers
npm run dev         # Next.js on port 3000
npm run dev:webhook # Express on port 4000

# Setup LINE webhook URL
# https://your-domain.com/webhook/line
```

### 15.3 First Steps
1. Login to dashboard at http://localhost:3000
2. Configure LINE webhook in LINE Developer Console
3. Send test messages to your LINE Official Account
4. View sessions in the dashboard
5. Test image uploads and AI summarization

## 16. Appendices

### A. API References
- [LINE Messaging API](https://developers.line.biz/en/docs/messaging-api/)
- [Google Gemini API](https://ai.google.dev/docs)
- [NextAuth.js](https://next-auth.js.org/)
- [tRPC](https://trpc.io/)
- [MongoDB GridFS](https://www.mongodb.com/docs/manual/core/gridfs/)

### B. Troubleshooting

| Issue | Solution |
|-------|----------|
| LINE webhook not receiving | Check signature validation, ngrok for local testing |
| Images not loading | Verify GridFS connection, check file permissions |
| Gemini API errors | Check API key, quota limits, retry with exponential backoff |
| Authentication issues | Verify OAuth credentials, check callback URLs |
| Session not closing | Check cron jobs, verify trigger conditions |

### C. Performance Optimization Tips
- Use Redis for session caching
- Implement image CDN for faster delivery
- Batch Gemini API calls when possible
- Use database indexes for common queries
- Implement pagination for large datasets
- Cache AI summaries for repeated access

---

*This implementation plan is a living document and will be updated as the project progresses and requirements evolve.*