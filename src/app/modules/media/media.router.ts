import express from 'express';
import { MediaController } from './media.controller';
import { auth } from '../auth/auth.middleware';
import { FileUploadHelper } from '../../../shared/fileUploadHelper';



const router = express.Router();

// 'file' হলো Postman বা Frontend এর Key name
router.post(
  '/upload',
  auth(), 
  FileUploadHelper.upload.single('file'), 
  MediaController.uploadMedia
); 


export const MediaRoutes = router;