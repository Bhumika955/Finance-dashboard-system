import express from 'express';
import dotenv from 'dotenv';
import { initDB } from './db/database';
import authRoutes from './routes/auth';
import userRoutes from './routes/users';
import recordRoutes from './routes/records';
import dashboardRoutes from './routes/dashboard';
dotenv.config();

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

initDB();

app.use('/auth', authRoutes);
app.use('/users', userRoutes);
app.use('/records', recordRoutes);
app.use('/dashboard', dashboardRoutes);

app.get('/', (req, res) => {
  res.json({ message: 'Finance Dashboard API running' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

export default app;