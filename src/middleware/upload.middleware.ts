import multer from "multer";

const storage = multer.memoryStorage();
const upload = multer({ storage });

export const uploadSingle = (fieldName: string) => upload.single(fieldName);
export const uploadMultiple = (fieldName: string, maxCount: number) => upload.array(fieldName, maxCount);
