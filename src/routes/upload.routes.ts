import { Router } from "express";
import { uploadController } from "../controllers/upload.controller";
import { uploadSingle, uploadMultiple } from "../middleware/upload.middleware";

const uploadRoutes = Router();

uploadRoutes.post("/single", uploadSingle("file"), uploadController.uploadSingle);
uploadRoutes.post("/multiple", uploadMultiple("files", 10), uploadController.uploadMultiple);

export default uploadRoutes;