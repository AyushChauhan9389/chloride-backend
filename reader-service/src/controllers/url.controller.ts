import { Request, Response } from 'express';
import { getOriginalUrl } from '../services/url.service';

export const redirect = async (req: Request, res: Response) => {
  const { shortCode } = req.params;

  try {
    const originalUrl = await getOriginalUrl(shortCode);

    if (originalUrl) {
      res.redirect(originalUrl);
    } else {
      res.status(404).json({ message: 'URL not found' });
    }
  } catch (error) {
    console.error('Redirect error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

