
import { Request, Response, NextFunction } from 'express';
import { extractUserFromToken } from '../services/auth.service';

export const authenticate = (req: Request, res: Response, next: NextFunction) => {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  const user = extractUserFromToken(token);

  if (!user) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  (req as any).user = user;
  next();
  return;
};
