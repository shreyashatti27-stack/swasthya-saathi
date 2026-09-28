import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import db from '../db.js';
import { generateToken, requireAuth } from '../middleware/auth.js';

const router = Router();

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(4),
});

// POST /api/auth/login
router.post('/login', (req, res) => {
  const parseResult = loginSchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({
      error: 'Invalid input parameters',
      details: parseResult.error.errors,
    });
  }

  const { email, password } = parseResult.data;
  const stmt = db.prepare('SELECT * FROM users WHERE email = ?');
  const user = stmt.get(email.toLowerCase().trim());

  if (!user) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  const isPasswordValid = bcrypt.compareSync(password, user.password_hash);
  if (!isPasswordValid) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  const token = generateToken(user);

  res.json({
    message: 'Login successful',
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      phc_name: user.phc_name,
      phone: user.phone,
    },
  });
});

// GET /api/auth/me
router.get('/me', requireAuth, (req, res) => {
  const stmt = db.prepare('SELECT id, name, email, role, phc_name, phone FROM users WHERE id = ?');
  const user = stmt.get(req.user.id);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }
  res.json({ user });
});

// GET /api/auth/demo-users - convenient list of demo accounts
router.get('/demo-users', (req, res) => {
  const stmt = db.prepare('SELECT id, name, email, role, phc_name, phone FROM users ORDER BY role, id');
  const users = stmt.all();
  res.json({ users });
});

export default router;
