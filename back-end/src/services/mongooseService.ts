import mongoose from 'mongoose';
import { MONGODB_URI } from '../config/env';

export const connectToDatabase = async () => {
    try {
        
        // Railway MongoDB works better without database name in URI
        // Specify database name in connection options instead
        const connectionOptions: mongoose.ConnectOptions = {
            dbName: 'kinmeet',
        };
        
        // Check if it's a Railway internal connection
        if (MONGODB_URI.includes('railway.internal')) {
            connectionOptions.tls = false;
        }
        
        await mongoose.connect(MONGODB_URI, connectionOptions);
        console.log('Connected to MongoDB');
        console.log(`Database: ${mongoose.connection.db?.databaseName || 'kinmeet'}`);
    } catch (error) {
        console.error('MongoDB connection error:', error);
        process.exit(1);
    }
};

mongoose.connection.on('disconnected', () => {
    console.warn('MongoDB disconnected. Trying to reconnect...');
}); 

