import { PutObjectCommand } from '@aws-sdk/client-s3';


import path from 'path';
import crypto from 'crypto';
import { s3Client } from '../../../shared/fileUploadHelper';



const uploadMedia = async (file: Express.Multer.File, alt_text?: string) => {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  
  // ১. ফাইলের নামকে SEO ফ্রেন্ডলি করা (Slugify)
  const originalName = path.parse(file.originalname).name;
  const sanitizedName = originalName
    .toLowerCase()
    .replace(/[^\w\s-]/g, '') 
    .replace(/[\s_-]+/g, '-') 
    .replace(/^-+|-+$/g, ''); 

  const uniqueId = crypto.randomBytes(4).toString('hex');
  const fileExtension = path.extname(file.originalname);
  
  // ফাইনাল নাম: shakib-al-hasan-8f7a2.jpg
  const fileName = `${sanitizedName}-${uniqueId}${fileExtension}`;
  
  // স্ট্রাকচার: media/images/2026/04/filename.jpg
  const fileKey = `media/images/${year}/${month}/${fileName}`;

  // ২. Cloudflare R2 আপলোড
  await s3Client.send(new PutObjectCommand({
    Bucket: process.env.R2_BUCKET_NAME as string,
    Key: fileKey,
    Body: file.buffer,
    ContentType: file.mimetype,
  }));

  
  const fileUrl = `${process.env.R2_PUBLIC_URL}/${process.env.R2_BUCKET_NAME}/${fileKey}`;

    return fileUrl;
};

export const MediaService = {
  uploadMedia,
};