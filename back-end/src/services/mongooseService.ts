import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/your-guitar-lessons';

export const connectToDatabase = async () => {
    try {
        await mongoose.connect(MONGODB_URI, {
            // useNewUrlParser and useUnifiedTopology are default in mongoose >=6
        });
        console.log('Connected to MongoDB');
    } catch (error) {
        console.error('MongoDB connection error:', error);
        process.exit(1);
    }
};

mongoose.connection.on('disconnected', () => {
    console.warn('MongoDB disconnected. Trying to reconnect...');
}); 