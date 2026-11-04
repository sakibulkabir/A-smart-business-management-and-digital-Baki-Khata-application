import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { prisma } from '../../config/prisma';
import { env } from '../../config/env';
import { authenticate } from '../../middleware/auth';

const router = Router();
const registerSchema = z.object({
  name: z.string().min(2).max(100),
  phone: z.string().regex(/^\+?[0-9]{10,15}$/),
  password: z.string().min(8).max(100)
});

router.post('/register', async (req, res, next) => {
  try {
    const input = registerSchema.parse(req.body);
    const existing = await prisma.user.findUnique({ where: { phone: input.phone } });
    if (existing) return res.status(409).json({ message: 'Phone number already registered' });
    const passwordHash = await bcrypt.hash(input.password, 12);
    const user = await prisma.user.create({
      data: { name: input.name, phone: input.phone, passwordHash, role: 'OWNER' },
      select: { id: true, name: true, phone: true, role: true }
    });
    const token = jwt.sign({ role: user.role, phone: user.phone }, env.JWT_ACCESS_SECRET, {
      subject: user.id, expiresIn: env.JWT_ACCESS_EXPIRES_IN as jwt.SignOptions['expiresIn']
    });
    res.status(201).json({ user, accessToken: token });
  } catch (e) { next(e); }
});

router.post('/login', async (req, res, next) => {
  try {
    const input = z.object({
      phone: z.string().min(10),
      password: z.string().min(1)
    }).parse(req.body);
    const user = await prisma.user.findUnique({ where: { phone: input.phone } });
    if (!user || !user.active || !(await bcrypt.compare(input.password, user.passwordHash))) {
      return res.status(401).json({ message: 'Phone or password is incorrect' });
    }
    const accessToken = jwt.sign({ role: user.role, phone: user.phone }, env.JWT_ACCESS_SECRET, {
      subject: user.id, expiresIn: env.JWT_ACCESS_EXPIRES_IN as jwt.SignOptions['expiresIn']
    });
    res.json({
      user: { id: user.id, name: user.name, phone: user.phone, role: user.role },
      accessToken
    });
  } catch (e) { next(e); }
});

router.get('/me', authenticate, async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: { id: true, name: true, phone: true, role: true, language: true }
    });
    res.json({ user });
  } catch (e) { next(e); }
});

export default router;
