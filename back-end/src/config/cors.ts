const corsOrigins: string[] = [
    'http://localhost:3000',
    'http://localhost:3001',
    'http://localhost:5173',
    'http://localhost:5174',
];

if (process.env.VERCEL_URL) {
    const vercelUrl = process.env.VERCEL_URL.startsWith('http')
        ? process.env.VERCEL_URL
        : `https://${process.env.VERCEL_URL}`;
    corsOrigins.push(vercelUrl);
}

if (process.env.REACT_FRONTEND_URL) {
    corsOrigins.push(process.env.REACT_FRONTEND_URL);
}

if (process.env.FRONTEND_URL) {
    corsOrigins.push(process.env.FRONTEND_URL);
}

export const corsConfig = {
    origin: corsOrigins,
    credentials: true,
};
