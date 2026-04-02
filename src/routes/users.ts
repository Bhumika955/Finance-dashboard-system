import { Router, Response } from 'express';
import db from '../db/database';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { requireRole } from '../middleware/rbac';

const router = Router();

// Get all users — sirf admin dekh sakta hai
router.get('/', requireAuth, requireRole('admin'), (req: AuthRequest, res: Response): void => {
  try {
    const users = db.prepare(
      'SELECT id, name, email, role, is_active, created_at FROM users'
    ).all();
    res.json(users);
  } catch {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Get single user
router.get('/:id', requireAuth, requireRole('admin'), (req: AuthRequest, res: Response): void => {
  try {
    const user = db.prepare(
      'SELECT id, name, email, role, is_active, created_at FROM users WHERE id = ?'
    ).get(req.params.id) as any;

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }
    res.json(user);
  } catch {
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// Update user role — sirf admin
router.patch('/:id/role', requireAuth, requireRole('admin'), (req: AuthRequest, res: Response): void => {
  const { role } = req.body;
  const validRoles = ['viewer', 'analyst', 'admin'];

  if (!role || !validRoles.includes(role)) {
    res.status(400).json({ error: 'Valid role required: viewer, analyst, admin' });
    return;
  }

  try {
    const user = db.prepare('SELECT id FROM users WHERE id = ?').get(req.params.id);
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    db.prepare('UPDATE users SET role = ? WHERE id = ?').run(role, req.params.id);
    res.json({ message: 'Role updated successfully' });
  } catch {
    res.status(500).json({ error: 'Failed to update role' });
  }
});

// Update user status active/inactive — sirf admin
router.patch('/:id/status', requireAuth, requireRole('admin'), (req: AuthRequest, res: Response): void => {
  const { is_active } = req.body;

  if (typeof is_active !== 'boolean') {
    res.status(400).json({ error: 'is_active must be true or false' });
    return;
  }

  try {
    const user = db.prepare('SELECT id FROM users WHERE id = ?').get(req.params.id);
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    db.prepare('UPDATE users SET is_active = ? WHERE id = ?').run(
      is_active ? 1 : 0, 
      req.params.id
    );
    res.json({ message: `User ${is_active ? 'activated' : 'deactivated'} successfully` });
  } catch {
    res.status(500).json({ error: 'Failed to update status' });
  }
});

// Delete user — sirf admin
router.delete('/:id', requireAuth, requireRole('admin'), (req: AuthRequest, res: Response): void => {
  try {
    const user = db.prepare('SELECT id FROM users WHERE id = ?').get(req.params.id);
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    db.prepare('DELETE FROM users WHERE id = ?').run(req.params.id);
    res.json({ message: 'User deleted successfully' });
  } catch {
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

export default router;