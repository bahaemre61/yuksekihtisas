import { NextResponse } from "next/server";
import { NextRequest } from "next/server";
import TechnicalRequest from "@/src/lib/models/TechnicalRequest";
import connectToDatabase from "@/src/lib/db";
import { getAuthenticatedUser } from "@/src/lib/auth";
import {sendMail} from "@/src/lib/mail";


export async function PUT(request:NextRequest) {
    
    try{
        const {user,error} = getAuthenticatedUser(request);
        if(error) return error;

        if(user.role !== 'admin' && user.role !== 'amir' && user.role !== 'tech'){
            return NextResponse.json({ msg: 'Yetkisiz erişim.'}, {status : 403});
        }

        await connectToDatabase();

        const body = await request.json();
        const { requestId, technicianIds } = body; 

    if (!requestId || !technicianIds || !Array.isArray(technicianIds)) {
      return NextResponse.json({ success: false, message: 'Eksik veya hatalı veri.' }, { status: 400 });
    }

    const updatedRequest = await TechnicalRequest.findByIdAndUpdate(
      requestId,
      { 
        technicalStaff: technicianIds,
        status: 'assigned'
      },
      { new: true }
    )
    .populate('user', 'name email')
    .populate('technicalStaff', 'name');  

    if(updatedRequest && updatedRequest.user?.email){
      const staffNames = updatedRequest.technicalStaff
      .map((staff: any) => staff.name)
      .join(', ');

      const subject = "🛠️ Teknik Destek Talebiniz Hakkında";
      const htmlContent = `
            <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px; max-width: 600px;">
                <h2 style="color: #ea580c;">Merhaba ${updatedRequest.user.name},</h2>
                <p>Oluşturduğunuz teknik destek talebi işleme alındı.</p>
                
                <div style="background-color: #fff7ed; padding: 15px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #ea580c;">
                    <p style="margin: 5px 0;"><strong>Konu:</strong> ${updatedRequest.title}</p>
                    <p style="margin: 5px 0;"><strong>Teknik Personeller:</strong> ${staffNames}</p>
                    <p style="margin: 5px 0;"><strong>Durum:</strong>Atandı</p>
                </div>

                <p>Ekiplerimiz en kısa sürede sorunu çözmek için yanınızda olacaktır.</p>
                <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
                <p style="font-size: 12px; color: #888;">Bu mesaj otomatik olarak gönderilmiştir.</p>
            </div>
        `;
      
      sendMail(updatedRequest.user.email, subject, htmlContent);
    }

    return NextResponse.json({ success: true, data: updatedRequest });

  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}