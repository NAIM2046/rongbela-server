//src/shared/mail.ts
import nodemailer from 'nodemailer';
import httpStatus from 'http-status';
import ApiError from '../app/error/ApiError';


const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  secure: process.env.SMTP_PORT === '465', 
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});


export const sendEmail = async (to: string, subject: string, htmlContent: string) => {
  try {
    const info = await transporter.sendMail({
      from: `"JU Bus Transport " <${process.env.SMTP_USER}>`, 
      to, 
      subject, 
      html: htmlContent, 
    });

    return info;
  } catch (error: any) {
    console.error('Nodemailer Error:', error.message);
    throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, 'Failed to send email');
  }
};

