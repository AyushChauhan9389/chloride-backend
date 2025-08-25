import { Request, Response } from "express";
import { uploadService } from "../services/upload.service";

class UploadController {
    async uploadSingle(req: Request, res: Response) {
        if (!req.file) {
            res.status(400).json({ message: "No file uploaded" });
            return;
        }

        try {
            const result = await uploadService.uploadSingle(req.file);
            res.status(200).json(result);
        } catch (error: any) {
            res.status(500).json({ message: error.message });
        }
    }

    async uploadMultiple(req: Request, res: Response) {
        if (!req.files) {
            res.status(400).json({ message: "No files uploaded" });
            return;
        }

        try {
            const result = await uploadService.uploadMultiple(req.files as Express.Multer.File[]);
            res.status(200).json(result);
        } catch (error: any) {
            res.status(500).json({ message: error.message });
        }
    }
}

export const uploadController = new UploadController();