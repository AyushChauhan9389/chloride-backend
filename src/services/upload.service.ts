class UploadService {
    async uploadSingle(file: Express.Multer.File) {
        return {
            message: "File uploaded successfully",
            file: {
                filename: file.originalname,
                size: file.size,
            }
        }
    }

    async uploadMultiple(files: Express.Multer.File[]) {
        return {
            message: "Files uploaded successfully",
            files: files.map(file => ({
                filename: file.originalname,
                size: file.size,
            }))
        }
    }
}

export const uploadService = new UploadService();