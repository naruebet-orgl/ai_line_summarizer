export const config = {
  // Database
  mongodb: {
    uri: process.env.MONGODB_URI!,
    dbName: process.env.MONGODB_DB_NAME || 'line_chat_summarizer'
  },

  // LINE OA
  line: {
    channelSecret: process.env.LINE_CHANNEL_SECRET!,
    channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN!
  },

  // Authentication
  auth: {
    betterAuth: {
      secret: process.env.BETTER_AUTH_SECRET!,
      url: process.env.BETTER_AUTH_URL || 'http://localhost:3000'
    }
  },

  // Application
  app: {
    nodeEnv: process.env.NODE_ENV || 'development',
    url: process.env.BETTER_AUTH_URL || 'http://localhost:3000'
  }
};

export const validateConfig = () => {
  const required = [
    'MONGODB_URI',
    'LINE_CHANNEL_SECRET', 
    'LINE_CHANNEL_ACCESS_TOKEN',
    'BETTER_AUTH_SECRET'
  ];

  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    console.error('❌ Missing required environment variables:');
    missing.forEach(key => console.error(`   - ${key}`));
    return false;
  }
  
  return true;
};