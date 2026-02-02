/**
 * @fileoverview Database Reset Script
 *
 * CAUTION: This script will delete ALL data from the database!
 * Use only for development/testing purposes.
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '..', '.env') });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/kings-pos';

async function resetDatabase() {
    try {
        console.log('🔌 Connecting to MongoDB...');
        await mongoose.connect(MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        const db = mongoose.connection.db;

        // Get all collections
        const collections = await db.listCollections().toArray();
        console.log(`\n📊 Found ${collections.length} collections\n`);

        if (collections.length === 0) {
            console.log('✨ Database is already empty');
            await mongoose.disconnect();
            return;
        }

        console.log('🗑️  Dropping collections:');

        // Drop each collection
        for (const collection of collections) {
            try {
                await db.collection(collection.name).drop();
                console.log(`   ✓ Dropped: ${collection.name}`);
            } catch (error) {
                console.log(`   ✗ Failed to drop: ${collection.name} - ${error.message}`);
            }
        }

        console.log('\n✅ Database reset complete!');
        console.log('📝 All collections have been dropped.');
        console.log('\n⚠️  You will need to:');
        console.log('   1. Re-register your account');
        console.log('   2. Create a new store');
        console.log('   3. Set up your data from scratch');

    } catch (error) {
        console.error('\n❌ Error resetting database:', error);
        throw error;
    } finally {
        await mongoose.disconnect();
        console.log('\n🔌 Disconnected from MongoDB');
    }
}

// Run the script
console.log('⚠️  WARNING: This will DELETE ALL DATA from the database!');
console.log('📍 Database:', MONGODB_URI);
console.log('\n');

resetDatabase()
    .then(() => {
        console.log('\n✨ Database reset completed successfully');
        process.exit(0);
    })
    .catch((error) => {
        console.error('\n💥 Database reset failed:', error);
        process.exit(1);
    });
