import { WEB_APP_URL } from './env';

const corsOrigins: string[] = [
    'http://localhost:5173',
    'http://localhost:5174',
];

if (WEB_APP_URL) {
    corsOrigins.push(WEB_APP_URL);
}

export const corsConfig = {
    origin: corsOrigins,
    credentials: true,
};
