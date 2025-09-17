import mongoose from 'mongoose';
import { config } from './config';

type ConnectionObject = {
  isConnected?: number;
};

const connection: ConnectionObject = {};

async function connectDB(): Promise<void> {
  // Check if we have a connection to the database or if it's currently connecting
  if (connection.isConnected) {
    console.log('💾 Using existing MongoDB connection');
    return;
  }

  try {
    console.log('🔄 Connecting to MongoDB...');
    
    if (!config.mongodb.uri) {
      throw new Error('MONGODB_URI is not defined in environment variables');
    }

    const db = await mongoose.connect(config.mongodb.uri, {
      dbName: config.mongodb.dbName
    });

    connection.isConnected = db.connections[0].readyState;
    
    console.log('✅ MongoDB Connected Successfully');
    console.log(`📁 Database: ${db.connection.name}`);
    
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    throw error;
  }
}

export default connectDB;