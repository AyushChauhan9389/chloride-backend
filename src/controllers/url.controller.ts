
import { Request, Response } from 'express';
import { urlService } from '../services/url.service';

class UrlController {
    async redirect(req: Request, res: Response) {
        const { shortCode } = req.params;
        const originalUrl = await urlService.getOriginalUrl(shortCode);

        if (originalUrl) {
            res.redirect(originalUrl);
        } else {
            res.status(404).json({ message: 'URL not found' });
        }
    }
}

export const urlController = new UrlController();
