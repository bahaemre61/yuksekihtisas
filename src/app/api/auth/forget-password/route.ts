import { NextResponse } from 'next/server';
import connectToDatabase from '@/src/lib/db';
import User from '@/src/lib/models/User';
import crypto from 'crypto';
import nodemailer from 'nodemailer';

export async function POST(request: Request) {
  try {
    const { email } = await request.json();

    await connectToDatabase();

    const user = await User.findOne({ email });
    if (!user) {
      return NextResponse.json({ msg: 'Bu e-posta ile kayıtlı kullanıcı bulunamadı.' }, { status: 404 });
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    
    user.resetPasswordToken = resetToken;
    user.resetPasswordExpires = Date.now() + 3600000; 
    await user.save();

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    const resetUrl = `http://192.168.2.198:3000/reset-password/${resetToken}`;

    // 7. Mail İçeriği
    const mailOptions = {
      from: `"Yüksek İhtisas Üniversitesi İdari Portal" <${process.env.EMAIL_USER}>`,
      to: user.email,
      subject: 'Şifre Sıfırlama Talebi',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
          <h2 style="color: #333;">Şifre Sıfırlama</h2>
          <p>Merhaba <b>${user.name}</b>,</p>
          <p>Hesabınız için şifre sıfırlama talebi aldık. Eğer bu işlemi siz yapmadıysanız, bu e-postayı görmezden gelebilirsiniz.</p>
          <p>Şifrenizi yenilemek için lütfen aşağıdaki butona tıklayın:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetUrl}" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">Şifremi Sıfırla</a>
          </div>
          <p style="font-size: 12px; color: #777;">Bu link 1 saat süreyle geçerlidir.</p>
          <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
          <p style="font-size: 12px; color: #999;">Linke tıklayamıyorsanız, aşağıdaki adresi tarayıcınıza kopyalayın:<br>
          <a href="${resetUrl}" style="color: #2563eb;">${resetUrl}</a></p>
        </div>
      `,
    };

    // 8. Maili Gönder
    await transporter.sendMail(mailOptions);

    return NextResponse.json({ msg: 'Sıfırlama bağlantısı e-posta adresinize gönderildi.' }, { status: 200 });

  } catch (error) {
    console.error("Mail Gönderme Hatası:", error);
    return NextResponse.json({ msg: 'Mail gönderilemedi. Lütfen daha sonra tekrar deneyin.' }, { status: 500 });
  }
}