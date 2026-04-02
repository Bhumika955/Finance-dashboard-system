import { Router, Response } from 'express';
import db from '../db/database';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { requireRole } from '../middleware/rbac';

const router = Router();

// Get all records — viewer, analyst, admin sab dekh sakte hain
// Filters: type, category, date_from, date_to
router.get('/', requireAuth, requireRole('viewer', 'analyst', 'admin'), (req: AuthRequest, res: Response): void => {
  try {
    const { type, category, date_from, date_to, search, page, limit } = req.query;

    // Pagination
    const pageNum = parseInt(page as string) || 1;
    const limitNum = parseInt(limit as string) || 10;
    const offset = (pageNum - 1) * limitNum;

    let query = 'SELECT * FROM financial_records WHERE deleted_at IS NULL';
    const params: any[] = [];

    if (type) {
      query += ' AND type = ?';
      params.push(type);
    }
    if (category) {
      query += ' AND category = ?';
      params.push(category);
    }
    if (date_from) {
      query += ' AND date >= ?';
      params.push(date_from);
    }
    if (date_to) {
      query += ' AND date <= ?';
      params.push(date_to);
    }
    if (search) {
      query += ' AND (category LIKE ? OR notes LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }

    // Total count for pagination info
    const countQuery = query.replace('SELECT *', 'SELECT COUNT(*) as total');
    const { total } = db.prepare(countQuery).get(...params) as any;

    query += ' ORDER BY date DESC LIMIT ? OFFSET ?';
    params.push(limitNum, offset);

    const records = db.prepare(query).all(...params);

    res.json({
      data: records,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        total_pages: Math.ceil(total / limitNum)
      }
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch records' });
  }
});
// Get single record
router.get('/:id', requireAuth, requireRole('viewer', 'analyst', 'admin'), (req: AuthRequest, res: Response): void => {
  try {
    const record = db.prepare(
      'SELECT * FROM financial_records WHERE id = ? AND deleted_at IS NULL'
    ).get(req.params.id) as any;

    if (!record) {
      res.status(404).json({ error: 'Record not found' });
      return;
    }
    res.json(record);
  } catch {
    res.status(500).json({ error: 'Failed to fetch record' });
  }
});

// Create record — sirf admin aur analyst
router.post('/', requireAuth, requireRole('admin', 'analyst'), (req: AuthRequest, res: Response): void => {
  const { amount, type, category, date, notes } = req.body;

  // Validation
  if (!amount || !type || !category || !date) {
    res.status(400).json({ error: 'Amount, type, category and date are required' });
    return;
  }

  if (!['income', 'expense'].includes(type)) {
    res.status(400).json({ error: 'Type must be income or expense' });
    return;
  }

  if (typeof amount !== 'number' || amount <= 0) {
    res.status(400).json({ error: 'Amount must be a positive number' });
    return;
  }

  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(date)) {
    res.status(400).json({ error: 'Date must be in YYYY-MM-DD format' });
    return;
  }

  try {
    const result = db.prepare(
      'INSERT INTO financial_records (user_id, amount, type, category, date, notes) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(req.user!.id, amount, type, category, date, notes || null);

    const newRecord = db.prepare(
      'SELECT * FROM financial_records WHERE id = ?'
    ).get(result.lastInsertRowid);

    res.status(201).json(newRecord);
  } catch {
    res.status(500).json({ error: 'Failed to create record' });
  }
});

// Update record — sirf admin aur analyst
router.put('/:id', requireAuth, requireRole('admin', 'analyst'), (req: AuthRequest, res: Response): void => {
  const { amount, type, category, date, notes } = req.body;

  // Validation
  if (!amount || !type || !category || !date) {
    res.status(400).json({ error: 'Amount, type, category and date are required' });
    return;
  }

  if (!['income', 'expense'].includes(type)) {
    res.status(400).json({ error: 'Type must be income or expense' });
    return;
  }

  if (typeof amount !== 'number' || amount <= 0) {
    res.status(400).json({ error: 'Amount must be a positive number' });
    return;
  }

  try {
    const record = db.prepare(
      'SELECT * FROM financial_records WHERE id = ? AND deleted_at IS NULL'
    ).get(req.params.id) as any;

    if (!record) {
      res.status(404).json({ error: 'Record not found' });
      return;
    }

    db.prepare(
      'UPDATE financial_records SET amount = ?, type = ?, category = ?, date = ?, notes = ? WHERE id = ?'
    ).run(amount, type, category, date, notes || null, req.params.id);

    const updated = db.prepare(
      'SELECT * FROM financial_records WHERE id = ?'
    ).get(req.params.id);

    res.json(updated);
  } catch {
    res.status(500).json({ error: 'Failed to update record' });
  }
});

// Soft Delete — sirf admin
router.delete('/:id', requireAuth, requireRole('admin'), (req: AuthRequest, res: Response): void => {
  try {
    const record = db.prepare(
      'SELECT * FROM financial_records WHERE id = ? AND deleted_at IS NULL'
    ).get(req.params.id);

    if (!record) {
      res.status(404).json({ error: 'Record not found' });
      return;
    }

    db.prepare(
      "UPDATE financial_records SET deleted_at = datetime('now') WHERE id = ?"
    ).run(req.params.id);

    res.json({ message: 'Record deleted successfully' });
  } catch {
    res.status(500).json({ error: 'Failed to delete record' });
  }
});

export default router;