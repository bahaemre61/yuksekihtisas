import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
});

export const sendMail = async(to: string, subject: string, htmlContent: string) => {
    try{
        const info = await transporter.sendMail({
            from: `"Yüksek İhtisas Üniversitesi"<${process.env.EMAIL_USER}>`,
            to: to,
            subject: subject,
            html: htmlContent,
        });
        console.log('Mail gönderildi: %s ' + info.messageId);
        return true;
    }catch(error)
    {
        console.error('Mail gönderilemedi: ', error);
        return false;
    }
};

export default sendMail;