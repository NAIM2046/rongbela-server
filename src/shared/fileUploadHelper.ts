import { S3Client } from '@aws-sdk/client-s3';
import multer from 'multer';


export const s3Client = new S3Client({
  region: 'auto', 
  endpoint: process.env.R2_ENDPOINT as string,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID as string,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY as string,
  },
  
});


const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, 
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only images (jpg, png, webp, etc.) are allowed!') as any);
    }
  },
});

export const FileUploadHelper = {
  upload,
};