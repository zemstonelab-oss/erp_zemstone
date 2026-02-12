import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { authRouter } from './routes/auth';
import { branchesRouter } from './routes/branches';
import { productsRouter } from './routes/products';
import { roundsRouter } from './routes/rounds';
import { shipmentsRouter } from './routes/shipments';
import { inventoryRouter } from './routes/inventory';
import { dashboardRouter } from './routes/dashboard';
import { extraOrdersRouter } from './routes/extra-orders';
import { notificationsRouter } from './routes/notifications';
import { alertThresholdsRouter } from './routes/alert-thresholds';
import { usersRouter } from './routes/users';
import { exportRouter } from './routes/export';
import { billingRouter } from './routes/billing';
import { auditLogsRouter } from './routes/audit-logs';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

app.use('/api/auth', authRouter);
app.use('/api/branches', branchesRouter);
app.use('/api/products', productsRouter);
app.use('/api/rounds', roundsRouter);
app.use('/api/shipments', shipmentsRouter);
app.use('/api/inventory', inventoryRouter);
app.use('/api/dashboard', dashboardRouter);
app.use('/api/extra-orders', extraOrdersRouter);
app.use('/api/notifications', notificationsRouter);
app.use('/api/alert-thresholds', alertThresholdsRouter);
app.use('/api/users', usersRouter);
app.use('/api/export', exportRouter);
app.use('/api/billing', billingRouter);
app.use('/api/audit-logs', auditLogsRouter);

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
