import express from 'express';
import { createServer } from 'http';
import jwt from 'jsonwebtoken';
import { User, IUser } from '../models/User';
import { errorHandler } from '../middleware/errorHandler';
import { corsConfig } from '../config/cors';
import cors from 'cors';
import authRoutes from '../routes/authRoutes';
import profileRoutes from '../routes/profileRoutes';
import matchingRoutes from '../routes/matchingRoutes';
import connectionsRoutes from '../routes/connectionsRoutes';
import chatRoutes from '../routes/chatRoutes';
import blockRoutes from '../routes/blockRoutes';
import notificationsRoutes from '../routes/notificationsRoutes';

export const createTestApp = () => {
  const app = express();
  app.use(cors(corsConfig));
  app.use(express.json());

  app.use('/api/auth', authRoutes);
  app.use('/api/profile', profileRoutes);
  app.use('/api/matching', matchingRoutes);
  app.use('/api/connections', connectionsRoutes);
  app.use('/api/chat', chatRoutes);
  app.use('/api/block', blockRoutes);
  app.use('/api/notifications', notificationsRoutes);

  app.use(errorHandler);
  return app;
};

export const createTestServer = () => {
  const app = createTestApp();
  return createServer(app);
};

interface TestUserData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  homeCountry: string;
  currentProvince: string;
  currentCountry: string;
  languages: string[];
  interests?: string[];
  lookingFor: string[];
  profileComplete?: boolean;
}

const defaultUserData: TestUserData = {
  email: 'testuser@example.com',
  password: 'TestPass123',
  firstName: 'Test',
  lastName: 'User',
  homeCountry: 'France',
  currentProvince: 'Ontario',
  currentCountry: 'Canada',
  languages: ['English', 'French'],
  interests: ['Hiking', 'Cooking'],
  lookingFor: ['Friendship'],
  profileComplete: true,
};

export const createTestUser = async (overrides: Partial<TestUserData> = {}): Promise<IUser> => {
  const data = { ...defaultUserData, ...overrides };
  const user = new User(data);
  await user.save();
  return user;
};

export const getAuthToken = (user: IUser): string => {
  return jwt.sign(
    { id: user._id.toString(), email: user.email, firstName: user.firstName },
    process.env.JWT_SECRET!,
    { expiresIn: '1h' },
  );
};
