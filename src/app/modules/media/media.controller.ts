import { Request, Response } from 'express';
import httpStatus from 'http-status';
import catchAsync from '../../../shared/catchAsync';
import ApiError from '../../error/ApiError';
import { MediaService } from './media.service';
import sendResponse from '../../../shared/sendResponse';




const uploadMedia = catchAsync(async (req: Request, res: Response) => {
  if (!req.file) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'No file uploaded! Please select an image.');
  }

  const result = await MediaService.uploadMedia(req.file, req.body.alt_text);

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: 'Media uploaded successfully!',
    data: result,
  });
});



export const MediaController = {
  uploadMedia,
  
};