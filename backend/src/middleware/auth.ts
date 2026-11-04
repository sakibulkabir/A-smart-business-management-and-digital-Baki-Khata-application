import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';

export function authenticate(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Authentication required' });
  }
  try {
    const payload = jwt.verify(header.slice(7), env.JWT_ACCESS_SECRET) as {
      sub: string; role: Express.Request['user'] extends infer U ? any : never; phone: string
    };
    req.user = { id: payload.sub, role: payload.role, phone: payload.phone };
    next();
  } catch {
    return res.status(401).json({ message: 'Invalid or expired access token' });
  }
}
