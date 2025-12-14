import { NextResponse } from "next/server";
import connectToDatabase from "@/src/lib/db";
import User from "@/src/lib/models/User";

export async function POST(request:Request) {
    try{
        const {token, newPassword} = await request.json();
        await connectToDatabase();

        const user = await User.findOne({
            resetPasswordToken: token,
            resetPasswordExpires : { $gt: Date.now() },
        });

        if(!user) {
            return NextResponse.json({msg : 'Geçersiz veya süresi dolmuş bağlantı.'}, {status : 400});
        }
        
        user.password = newPassword;
        user.resetPasswordToken = undefined;
        user.resetPasswordTokenExpires = undefined;

        await user.save();

        return NextResponse.json({ msg : 'Şifreniz başarıyla sıfırlandı.'}, {status : 200});
    }catch (err){
        console.error(err);
        return NextResponse.json({ msg: "Sunucu Hatası."}, {status: 500});
    }
}