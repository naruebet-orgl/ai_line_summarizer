### 5. Frontend Components
- **Authentication**: Secure login/signup pages with provider options
- **Route Protection**: Role-based access control middleware
- **Dashboard**: Layout with sidebar navigation and user profile
- **Real-time Updates**: tRPC subscriptions for live data
- **Image Gallery**: Lightbox functionality with Gemini analysis results
- **Responsive Design**: Mobile/desktop optimization
- **Loading States**: Skeleton screens and progress indicators
- **Error Handling**: User-friendly error messages and retry mechanisms### 6. Image Processing Pipeline
```typescript
// Enhanced image handling workflow with AI
1. Line webhook receives image message
2. Download image from Line CDN
3. Validate file type and size
4. Store original in GridFS
5. Generate thumbnail (if needed)
6. Store thumbnail in GridFS
7. **NEW**: Analyze image with Gemini Vision API
8. Save metadata + AI analysis to Message collection
9. Update session image count and AI flags
10. Trigger real-time updates via tRPC subscriptions
```# Line Chatbot Summarizer AI - Product Requirements Document

## Overview
A web application that connects to Line Official Account (OA) to read, process, and summarize chat conversations using AI, providing insights and summaries for business analysis.

## Tech Stack
- **Frontend**: Next.js + Tailwind CSS
- **Backend**: Express.js + tRPC
- **Database**: MongoDB (with GridFS for images)
- **Authentication**: NextAuth.js (Auth.js v5) with multiple providers
- **Integration**: Line Messaging API
- **AI**: Google Gemini API (multimodal support)
- **File Storage**: MongoDB GridFS
- **Session Management**: JWT + Redis (optional)

## Core Features

### 1. Line OA Integration
- Connect to Line Official Account via webhook
- Read incoming messages from users
- Store chat data securely
- Handle Line API authentication and permissions

### 2. Chat Data Management
- **Real-time Message Capture**: Store all incoming messages with metadata
- **Image Handling**: Download and store images from Line messages
- **User Session Tracking**: Track individual user conversations
- **Data Structure**: 
  ```typescript
  interface Message {
    _id: ObjectId,
    userId: string,
    sessionId: string,
    content?: string,
    messageType: 'text' | 'image' | 'sticker' | 'audio',
    imageData?: {
      messageId: string,
      originalUrl: string,
      previewUrl: string,
      localPath: string,
      gridFSId: ObjectId,
      fileSize: number,
      mimeType: string
    },
    timestamp: Date,
    lineMessageId: string
  }
  
  interface Session {
    _id: ObjectId,
    userId: string,
    status: 'active' | 'closed',
    startTime: Date,
    endTime?: Date,
    messageCount: number,
    hasImages: boolean,
    summary?: ObjectId
  }
  ```

### 3. Session Management
**Session Triggers** (either condition closes session):
- **Message Count**: 50 conversations per session
- **Time Limit**: 24 hours (1 day) per session
- **Manual Close**: Admin can manually close session

**Session Logic**:
- Auto-create new session when previous closes
- Track session duration and message count
- Maintain session history for each user

### 4. AI Summarization Engine (Gemini)
- **Multimodal Analysis**: Process both text and images in conversations
- **Input**: Complete session chat history + images
- **Gemini Features**:
  - Text summarization with context understanding
  - Image analysis and description
  - Visual content interpretation
  - Combined text + image insights
- **Output**: Structured summary including:
  - Key topics discussed
  - User intent/requirements
  - Action items or follow-ups
  - Sentiment analysis
  - Important highlights
  - Image content descriptions
  - Visual context insights

### 5. Authentication System
**NextAuth.js Configuration**:
- **Providers**: Google, GitHub, Email/Password, Line Login
- **Session Strategy**: Database sessions with JWT tokens
- **Role-Based Access**: Admin, Viewer, Analyst roles
- **Security Features**:
  - CSRF protection
  - Session rotation
  - Rate limiting
  - Secure cookies

**User Roles**:
- **Admin**: Full access, user management, system settings
- **Analyst**: View/analyze sessions, generate summaries
- **Viewer**: Read-only access to sessions and summaries

### 6. Frontend Dashboard
**Authentication Flow**:
- Secure login page with multiple provider options
- Protected routes with role-based access
- Session management with automatic refresh

**Main Views**:
- **Login/Register**: Multi-provider authentication
- **Active Sessions**: Live chat monitoring with image previews
- **Session History**: Past conversations and summaries
- **User Management**: Individual user chat history with media gallery (Admin only)
- **Analytics**: Summary statistics and insights
- **Image Gallery**: View all images from conversations
- **Settings**: User profile, preferences, API keys (Admin)

**Key Components**:
- Session list with filters (date, user, status, has images)
- Chat viewer with message timeline and image display
- Image modal/lightbox for full-size viewing
- Summary display with key insights
- Export functionality (PDF, JSON)
- Image download/export options

### 7. Image Management System
- **Image Processing**: Download images from Line CDN
- **Storage**: Store in MongoDB GridFS with metadata
- **AI Analysis**: Gemini Vision API for image content analysis
- **Optimization**: Generate thumbnails for quick loading
- **Security**: Validate image types and file sizes
- **Web Display**: Responsive image gallery with lazy loading

## API Endpoints

### tRPC Routes
```typescript
// Authentication & Authorization
auth.login               # Handle OAuth providers
auth.logout              # Secure logout
auth.getSession          # Get current user session
auth.checkPermissions    # Role-based access control

// Health & Admin
health.check
admin.getUsers           # Get all users (Admin only)
admin.updateUserRole     # Update user roles (Admin only)
admin.getSystemStats     # System statistics (Admin only)

// Sessions (Role-protected)
sessions.getAll           # Get all sessions with pagination
sessions.getById          # Get specific session with messages
sessions.close            # Manually close session (Analyst+)
sessions.summarize        # Generate AI summary (Analyst+)
sessions.delete           # Delete session (Admin only)

// Messages
messages.getBySession     # Get messages for session
messages.create           # Create new message (internal)
messages.analyzeImage     # Gemini image analysis

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
analytics.getImageStats     # Image upload statistics
analytics.getUserActivity   # User activity metrics
analytics.getAIUsage        # Gemini API usage stats (Admin only)

// AI & Gemini
ai.summarizeSession      # Generate summary with Gemini
ai.analyzeImages         # Batch image analysis
ai.generateInsights      # Advanced AI insights
ai.testConnection        # Test Gemini API connection (Admin only)
```

### Express Routes (Legacy/Webhook)
```
POST /webhook/line          # Line webhook for incoming messages
GET  /api/images/:gridfsId  # Direct image serving (fallback)
```

## Technical Implementation

### 1. Line Integration Setup
- Register Line Official Account
- Configure webhook URL
- Set up messaging API credentials
- Implement message verification
- Handle image message types

### 2. MongoDB & GridFS Setup
```typescript
// GridFS configuration for image storage
const mongoose = require('mongoose');
const Grid = require('gridfs-stream');

// GridFS bucket for images
const imageBucket = new mongoose.mongo.GridFSBucket(db, {
  bucketName: 'images'
});

// Image upload helper
async function uploadImageToGridFS(buffer: Buffer, metadata: any) {
  const uploadStream = imageBucket.openUploadStream(filename, {
    metadata: metadata
  });
  // Stream buffer to GridFS
}
```

### 2. Database Schema (MongoDB)
```typescript
// Collections
interface User {
  _id: ObjectId;
  lineUserId: string;
  displayName: string;
  pictureUrl?: string;
  createdAt: Date;
  lastActive: Date;
}

interface Session {
  _id: ObjectId;
  userId: string;
  status: 'active' | 'closed';
  startTime: Date;
  endTime?: Date;
  messageCount: number;
  imageCount: number;
  hasImages: boolean;
  createdAt: Date;
  updatedAt: Date;
}

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
  };
  timestamp: Date;
  createdAt: Date;
}

interface Summary {
  _id: ObjectId;
  sessionId: ObjectId;
  aiSummary: string;
  keyTopics: string[];
  sentiment: 'positive' | 'neutral' | 'negative';
  actionItems: string[];
  createdAt: Date;
}

// GridFS for file storage
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
    isThumnail: boolean;
    originalImageId?: ObjectId;
  };
}
```

### 3. Gemini AI Integration
```typescript
// Gemini configuration
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Text + Image analysis
async function analyzeSessionWithGemini(sessionData: any) {
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });
  
  // Prepare multimodal content
  const content = [
    { text: "Analyze this chat session and provide insights:" },
    { text: sessionData.messages.map(m => m.content).join('\n') },
    ...sessionData.images.map(img => ({ 
      inlineData: { 
        mimeType: img.mimeType, 
        data: img.base64Data 
      } 
    }))
  ];
  
  const result = await model.generateContent(content);
  return result.response.text();
}

// Image-only analysis
async function analyzeImageWithGemini(imageBuffer: Buffer, mimeType: string) {
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
  
  const imagePart = {
    inlineData: {
      data: imageBuffer.toString('base64'),
      mimeType: mimeType
    }
  };
  
  const prompt = "Describe this image in detail, identify objects, text (if any), and provide context for a chat conversation.";
  const result = await model.generateContent([prompt, imagePart]);
  
  return {
    description: result.response.text(),
    confidence: 0.9, // Gemini doesn't provide confidence scores
    analyzedAt: new Date()
  };
}
```

### 4. NextAuth.js Setup
```typescript
// /pages/api/auth/[...nextauth].ts
import NextAuth from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'
import GitHubProvider from 'next-auth/providers/github'
import CredentialsProvider from 'next-auth/providers/credentials'
import { MongoDBAdapter } from "@auth/mongodb-adapter"
import { MongoClient } from "mongodb"

const client = new MongoClient(process.env.MONGODB_URI!)
const clientPromise = client.connect()

export default NextAuth({
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
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        // Custom authentication logic
        return await validateUser(credentials)
      }
    })
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role
        token.permissions = user.permissions
      }
      return token
    },
    async session({ session, token }) {
      session.user.role = token.role
      session.user.permissions = token.permissions
      return session
    }
  },
  pages: {
    signIn: '/auth/signin',
    signUp: '/auth/signup',
    error: '/auth/error',
  },
  session: {
    strategy: "jwt",
    maxAge: 24 * 60 * 60, // 24 hours
  },
  secret: process.env.NEXTAUTH_SECRET,
})
```

## MVP Scope
**Phase 1 (3-4 weeks)**:
- ✅ MongoDB setup with GridFS
- ✅ NextAuth.js setup with Google/GitHub providers
- ✅ tRPC setup with authentication middleware
- ✅ Line webhook integration
- ✅ Text message storage
- ✅ Basic role-based access control
- ✅ Simple session management (50 msgs OR 24hrs)
- ✅ Protected dashboard with login

**Phase 2 (2-3 weeks)**:
- ✅ Image download and storage pipeline
- ✅ Gemini AI integration for text summarization
- ✅ Basic image gallery and viewer
- ✅ User management (Admin features)
- ✅ Enhanced UI with filters and search

**Phase 3 (2-3 weeks)**:
- ✅ Gemini Vision API for image analysis
- ✅ Auto-summarization on session close
- ✅ Advanced authentication features
- ✅ Image optimization and thumbnails
- ✅ Export functionality with AI insights

**Phase 4 (1-2 weeks)**:
- ✅ Advanced analytics with AI usage tracking
- ✅ Performance optimization
- ✅ Security hardening
- ✅ Production deployment

## Success Metrics
- Successfully capture 100% of Line messages and images
- Store images with 99.9% reliability
- Generate summaries within 30 seconds using Gemini
- Dashboard loads in <2 seconds
- Image gallery loads in <3 seconds
- Zero message/image loss during processing
- Support images up to 10MB per file
- Authentication flow completes in <5 seconds
- Role-based access control works 100% reliably
- Gemini API response time <10 seconds for image analysis
