import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import db from '../db/database';

const router = Router();

// Register
router.post('/register', (req: Request, res: Response): void => {
  const { name, email, password, role } = req.body;

  if (!name || !email || !password) {
    res.status(400).json({ error: 'Name, email and password are required' });
    return;
  }

  const validRoles = ['viewer', 'analyst', 'admin'];
  const userRole = role && validRoles.includes(role) ? role : 'viewer';

  try {
    const existingUser = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    if (existingUser) {
      res.status(409).json({ error: 'Email already registered' });
      return;
    }

    const password_hash = bcrypt.hashSync(password, 10);

    const result = db.prepare(
      'INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)'
    ).run(name, email, password_hash, userRole);

    res.status(201).json({ 
      message: 'User registered successfully',
      userId: result.lastInsertRowid 
    });
  } catch (err) {
    res.status(500).json({ error: 'Registration failed' });
  }
});

// Login
router.post('/login', (req: Request, res: Response): void => {
  const { email, password } = req.body;

  if (!email || !password) {
    res.status(400).json({ error: 'Email and password are required' });
    return;
  }

  try {
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email) as any;

    if (!user) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    if (!user.is_active) {
      res.status(403).json({ error: 'Account is deactivated' });
      return;
    }

    const isValid = bcrypt.compareSync(password, user.password_hash);
    if (!isValid) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET as string,
      { expiresIn: '24h' }
    );

    res.json({ 
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role }
    });
  } catch (err) {
    res.status(500).json({ error: 'Login failed' });
  }
});

export default router;