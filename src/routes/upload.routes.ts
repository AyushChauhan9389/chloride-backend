
import { Router } from "express";
import { uploadController } from "../controllers/upload.controller";
import { uploadSingle, uploadMultiple } from "../middleware/upload.middleware";
import { authenticate } from "../middleware/auth.middleware";

const uploadRoutes = Router();

uploadRoutes.post("/single", authenticate, uploadSingle("file"), uploadController.uploadSingle);
uploadRoutes.post("/multiple", authenticate, uploadMultiple("files", 10), uploadController.uploadMultiple);

export default uploadRoutes;
