import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI || process.env.MONGO_URL || 'mongodb://localhost:27017/kinmeet';

export const connectToDatabase = async () => {
    try {
        if (!MONGODB_URI) {
            throw new Error('MONGODB_URI or MONGO_URL environment variable is not set');
        }
        
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
