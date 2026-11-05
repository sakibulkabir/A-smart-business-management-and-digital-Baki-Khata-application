import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import { env } from './config/env';
import authRoutes from './modules/auth/auth.routes';
import shopRoutes from './modules/shops/shops.routes';
import customerRoutes from './modules/customers/customers.routes';
import creditRoutes from './modules/credits/credits.routes';
import paymentRoutes from './modules/payments/payments.routes';
import reportRoutes from './modules/reports/reports.routes';
import { errorHandler, notFound } from './middleware/error';

export const app = express();
app.use(helmet());
const allowedOrigins = [
  'https://business-management-digital-bakikhata.netlify.app',
  'http://localhost:5173',
  env.FRONTEND_URL
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));
app.use(express.json({ limit: '1mb' }));
app.use(morgan('dev'));
app.use('/api/v1', rateLimit({ windowMs: 15 * 60 * 1000, limit: 300 }));
app.get('/api/v1/health', (_req, res) => res.json({ status: 'ok', service: 'HisabBondhu API' }));
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/shops', shopRoutes);
app.use('/api/v1/customers', customerRoutes);
app.use('/api/v1/credits', creditRoutes);
app.use('/api/v1/payments', paymentRoutes);
app.use('/api/v1/reports', reportRoutes);
app.use(notFound);
app.use(errorHandler);
