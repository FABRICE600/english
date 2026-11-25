import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import type { UserRole } from '../types.ts';

const JWT_SECRET = process.env.JWT_SECRET || 'lingualearn_dev_jwt_secret_change_in_production_2026';

export interface AuthPayload {
  userId: string;
  role: UserRole;
  email: string;
}

export interface AuthRequest extends Request {
  user?: AuthPayload;
}

export function signToken(payload: AuthPayload): string {
  const raw = process.env.JWT_EXPIRES_IN?.trim().replace(/^["']|["']$/g, '');
  let expiresIn: jwt.SignOptions['expiresIn'] = '7d';
  if (raw) {
    if (/^\d+$/.test(raw)) {
      expiresIn = Number(raw);
    } else if (/^\d+[smhdw]$/.test(raw)) {
      expiresIn = raw as jwt.SignOptions['expiresIn'];
    }
  }
  return jwt.sign(payload, JWT_SECRET, { expiresIn });
}

export function authenticate(req: AuthRequest, res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    res.status(401).json({ message: 'Authentication token is required.' });
    return;
  }

  const token = header.slice(7);
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as AuthPayload;
    req.user = decoded;
    next();
  } catch {
    res.status(401).json({ message: 'Invalid or expired authentication token.' });
  }
}

export function optionalAuth(req: AuthRequest, _res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (header && header.startsWith('Bearer ')) {
    try {
      req.user = jwt.verify(header.slice(7), JWT_SECRET) as AuthPayload;
    } catch {
      // ignore invalid optional token
    }
  }
  next();
}

export function requireRole(...roles: UserRole[]) {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ message: 'Authentication required.' });
      return;
    }
    if (!roles.includes(req.user.role)) {
      res.status(403).json({ message: 'You do not have permission to perform this action.' });
      return;
    }
    next();
  };
}
