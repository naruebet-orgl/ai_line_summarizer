/**
 * Fix Owner Collection Index Issue
 * Removes legacy line_official_account_id unique index that causes duplicate key errors
 */

const mongoose = require('mongoose');
const config = require('../config');

async function fixOwnerIndex() {
  try {
    console.log('🔧 Connecting to MongoDB...');
    await mongoose.connect(config.mongodb.uri, {
      dbName: config.mongodb.dbName
    });
    console.log('✅ Connected to MongoDB');

    const db = mongoose.connection.db;
    const ownersCollection = db.collection('owners');

    // List all indexes
    console.log('\n📋 Current indexes on owners collection:');
    const indexes = await ownersCollection.indexes();
    indexes.forEach(index => {
      console.log(`   - ${index.name}: ${JSON.stringify(index.key)}`);
    });

    // Check if problematic index exists
    const hasLegacyIndex = indexes.some(idx => idx.name === 'line_official_account_id_1');

    if (hasLegacyIndex) {
      console.log('\n🗑️ Dropping legacy index: line_official_account_id_1');
      await ownersCollection.dropIndex('line_official_account_id_1');
      console.log('✅ Legacy index dropped successfully');
    } else {
      console.log('\n✅ No legacy index found - nothing to drop');
    }

    // Show remaining indexes
    console.log('\n📋 Remaining indexes:');
    const remainingIndexes = await ownersCollection.indexes();
    remainingIndexes.forEach(index => {
      console.log(`   - ${index.name}: ${JSON.stringify(index.key)}`);
    });

    console.log('\n✅ Index fix completed successfully');

  } catch (error) {
    console.error('❌ Error fixing owner index:', error);
    throw error;
  } finally {
    await mongoose.connection.close();
    console.log('🔌 MongoDB connection closed');
  }
}

// Run if executed directly
if (require.main === module) {
  fixOwnerIndex()
    .then(() => {
      console.log('\n🎉 Done!');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n❌ Failed:', error);
      process.exit(1);
    });
}

module.exports = fixOwnerIndex;
