import nodemailer from "nodemailer";

export const sendMessageByEmail = async (email: string, subject: string ,html: string) => {
  
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT),
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  await transporter.sendMail({
    from: `"রঙবেলা (Rongbela)" <${process.env.SMTP_FROM}>`,
    to: email,
    subject:subject,
    html: html
  });
};