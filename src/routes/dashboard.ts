import { Router, Response } from 'express';
import db from '../db/database';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { requireRole } from '../middleware/rbac';

const router = Router();

router.get('/summary', requireAuth, requireRole('analyst', 'admin'), (req: AuthRequest, res: Response): void => {
  try {
    const income = db.prepare(`
      SELECT COALESCE(SUM(amount), 0) as total 
      FROM financial_records 
      WHERE type = 'income' AND deleted_at IS NULL
    `).get() as any;

    const expense = db.prepare(`
      SELECT COALESCE(SUM(amount), 0) as total 
      FROM financial_records 
      WHERE type = 'expense' AND deleted_at IS NULL
    `).get() as any;

    const totalIncome = income.total;
    const totalExpense = expense.total;

    res.json({
      total_income: totalIncome,
      total_expense: totalExpense,
      net_balance: totalIncome - totalExpense
    });
  } catch {
    res.status(500).json({ error: 'Failed to fetch summary' });
  }
});

router.get('/by-category', requireAuth, requireRole('analyst', 'admin'), (req: AuthRequest, res: Response): void => {
  try {
    const data = db.prepare(`
      SELECT 
        category,
        type,
        COALESCE(SUM(amount), 0) as total,
        COUNT(*) as count
      FROM financial_records
      WHERE deleted_at IS NULL
      GROUP BY category, type
      ORDER BY total DESC
    `).all();

    res.json(data);
  } catch {
    res.status(500).json({ error: 'Failed to fetch category data' });
  }
});

router.get('/monthly-trends', requireAuth, requireRole('analyst', 'admin'), (req: AuthRequest, res: Response): void => {
  try {
    const data = db.prepare(`
      SELECT 
        strftime('%Y-%m', date) as month,
        type,
        COALESCE(SUM(amount), 0) as total,
        COUNT(*) as count
      FROM financial_records
      WHERE deleted_at IS NULL
      GROUP BY month, type
      ORDER BY month DESC
    `).all();

    res.json(data);
  } catch {
    res.status(500).json({ error: 'Failed to fetch monthly trends' });
  }
});

router.get('/recent', requireAuth, requireRole('viewer', 'analyst', 'admin'), (req: AuthRequest, res: Response): void => {
  try {
    const data = db.prepare(`
      SELECT 
        fr.*,
        u.name as created_by
      FROM financial_records fr
      JOIN users u ON fr.user_id = u.id
      WHERE fr.deleted_at IS NULL
      ORDER BY fr.created_at DESC
      LIMIT 10
    `).all();

    res.json(data);
  } catch {
    res.status(500).json({ error: 'Failed to fetch recent activity' });
  }
});

router.get('/weekly-trends', requireAuth, requireRole('analyst', 'admin'), (req: AuthRequest, res: Response): void => {
  try {
    const data = db.prepare(`
      SELECT 
        strftime('%Y-%W', date) as week,
        type,
        COALESCE(SUM(amount), 0) as total,
        COUNT(*) as count
      FROM financial_records
      WHERE 
        deleted_at IS NULL AND
        date >= date('now', '-28 days')
      GROUP BY week, type
      ORDER BY week DESC
    `).all();

    res.json(data);
  } catch {
    res.status(500).json({ error: 'Failed to fetch weekly trends' });
  }
});

export default router;