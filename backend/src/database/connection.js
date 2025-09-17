/**
 * MongoDB Connection Setup
 * Establishes and manages database connection with error handling
 */

const mongoose = require('mongoose');
const config = require('../config');

class DatabaseConnection {
  constructor() {
    this.isConnected = false;
    this.retryCount = 0;
    this.maxRetries = 5;
    
    console.log('🗄️  DatabaseConnection initialized');
  }

  /**
   * Establishes connection to MongoDB
   * @returns {Promise<boolean>} - Connection success status
   */
  async connect() {
    try {
      // Check if MongoDB is disabled for testing
      if (config.mongodb.uri === 'disabled') {
        console.log('⚠️  MongoDB disabled for testing - webhook functionality will work without database');
        this.isConnected = false;
        return false;
      }

      console.log('🔌 Connecting to MongoDB...');
      console.log(`📍 Database: ${config.mongodb.dbName}`);

      const options = {
        dbName: config.mongodb.dbName,
        maxPoolSize: 10,
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
      };

      await mongoose.connect(config.mongodb.uri, options);
      
      this.isConnected = true;
      this.retryCount = 0;
      
      console.log('✅ MongoDB connected successfully');
      console.log(`🏢 Database Name: ${mongoose.connection.db.databaseName}`);
      
      this.setupEventListeners();
      return true;
      
    } catch (error) {
      console.error('❌ MongoDB connection error:', error);
      
      if (this.retryCount < this.maxRetries) {
        this.retryCount++;
        console.log(`🔄 Retrying connection (${this.retryCount}/${this.maxRetries}) in 5 seconds...`);
        
        setTimeout(() => {
          this.connect();
        }, 5000);
      } else {
        console.error('💀 Maximum connection retries exceeded. Exiting...');
        process.exit(1);
      }
      
      return false;
    }
  }

  /**
   * Sets up MongoDB event listeners
   */
  setupEventListeners() {
    mongoose.connection.on('connected', () => {
      console.log('📡 MongoDB connection established');
    });

    mongoose.connection.on('error', (error) => {
      console.error('❌ MongoDB connection error:', error);
      this.isConnected = false;
    });

    mongoose.connection.on('disconnected', () => {
      console.warn('⚠️ MongoDB disconnected');
      this.isConnected = false;
    });

    // Handle application termination
    process.on('SIGINT', async () => {
      await this.disconnect();
      process.exit(0);
    });

    process.on('SIGTERM', async () => {
      await this.disconnect();
      process.exit(0);
    });
  }

  /**
   * Closes MongoDB connection
   * @returns {Promise<void>}
   */
  async disconnect() {
    try {
      console.log('🔌 Closing MongoDB connection...');
      await mongoose.connection.close();
      this.isConnected = false;
      console.log('✅ MongoDB connection closed');
    } catch (error) {
      console.error('❌ Error closing MongoDB connection:', error);
    }
  }

  /**
   * Gets connection status
   * @returns {boolean} - Connection status
   */
  getStatus() {
    return this.isConnected && mongoose.connection.readyState === 1;
  }

  /**
   * Gets database connection info
   * @returns {Object} - Connection information
   */
  getConnectionInfo() {
    return {
      isConnected: this.isConnected,
      readyState: mongoose.connection.readyState,
      host: mongoose.connection.host,
      port: mongoose.connection.port,
      database: mongoose.connection.db?.databaseName
    };
  }

  /**
   * Creates database indexes as specified in schema
   * @returns {Promise<void>}
   */
  async createIndexes() {
    try {
      console.log('📊 Creating database indexes...');

      const db = mongoose.connection.db;

      // Helper function to create index if it doesn't exist
      const createIndexIfNotExists = async (collection, index, options = {}) => {
        try {
          await db.collection(collection).createIndex(index, options);
        } catch (error) {
          if (error.code === 86) { // Index already exists with different options
            console.log(`⚠️  Index already exists for ${collection}: ${JSON.stringify(index)}`);
          } else {
            throw error;
          }
        }
      };

      // Chat Sessions indexes
      await createIndexIfNotExists('chat_sessions', { status: 1, start_time: -1 });
      await createIndexIfNotExists('chat_sessions', { owner_id: 1, start_time: -1 });
      await createIndexIfNotExists('chat_sessions', { session_id: 1 }, { unique: true });
      await createIndexIfNotExists('chat_sessions', { room_id: 1, start_time: -1 });

      // Owners indexes
      await createIndexIfNotExists('owners', { line_official_account_id: 1 }, { unique: true });
      await createIndexIfNotExists('owners', { is_active: 1 });

      // Rooms indexes
      await createIndexIfNotExists('rooms', { owner_id: 1 });
      await createIndexIfNotExists('rooms', { line_room_id: 1 });

      // Summaries indexes
      await createIndexIfNotExists('summaries', { session_id: 1 }, { unique: true });
      await createIndexIfNotExists('summaries', { status: 1 });

      // Line Events Raw indexes
      await createIndexIfNotExists('line_events_raw', { event_type: 1, received_at: -1 });
      await createIndexIfNotExists('line_events_raw', { user_id: 1, received_at: -1 });

      // LINE Events Raw indexes (TTL - 60 days) - skip if already exists
      await createIndexIfNotExists('line_events_raw',
        { received_at: 1 },
        { expireAfterSeconds: 60 * 60 * 24 * 60 }
      );

      // Audit Reads indexes (optional)
      await createIndexIfNotExists('audit_reads', { when: -1 });
      await createIndexIfNotExists('audit_reads', { subject: 1, when: -1 });

      console.log('✅ Database indexes created successfully');

    } catch (error) {
      console.error('❌ Error creating database indexes:', error);
    }
  }
}

// Export singleton instance
const dbConnection = new DatabaseConnection();
module.exports = dbConnection;