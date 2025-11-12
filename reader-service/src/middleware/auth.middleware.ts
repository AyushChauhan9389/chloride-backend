import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { JWTPayload } from '@chloride/shared';

const JWT_SECRET = process.env.JWT_SECRET!;

export const authenticate = (req: Request, res: Response, next: NextFunction) => {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Unauthorized - No token provided' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload;
    (req as any).user = decoded;
    next();
    return;
  } catch (error) {
    return res.status(401).json({ message: 'Unauthorized - Invalid token' });
  }
};

// Optional auth - doesn't fail if no token
export const optionalAuth = (req: Request, res: Response, next: NextFunction) => {
  const token = req.headers.authorization?.split(' ')[1];

  if (token) {
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload;
      (req as any).user = decoded;
    } catch (error) {
      // Ignore invalid token for optional auth
    }
  }

  next();
  return;
};

