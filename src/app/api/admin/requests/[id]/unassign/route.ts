import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import connectToDatabase from "@/src/lib/db";
import VehicleRequest, { RequestStatus } from "@/src/lib/models/VehicleRequest";
import User, { UserRole } from "@/src/lib/models/User";
import { getAuthenticatedUser } from "@/src/lib/auth";

export async function PUT(
  requests: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const resolvedParams = await params;
  const requestId = resolvedParams.id; 

  const { user, error } = getAuthenticatedUser(requests);
  if (error) return error;

  if (user.role !== UserRole.ADMIN) {
    return NextResponse.json({ msg: "Yasak: Yetkisiz giriş." }, { status: 403 });
  }

  try {
    await connectToDatabase();

    const requestDoc = await VehicleRequest.findById(requestId);
    
    if (!requestDoc) {
      return NextResponse.json({ msg: 'Talep bulunamadı' }, { status: 404 });
    }

    const driverId = requestDoc.assignedDriver;

    await VehicleRequest.findByIdAndUpdate(
      requestId,
      {
        status: RequestStatus.PENDING,
        $unset: { assignedDriver: 1 } 
      }
    );

    if (driverId) {
      const remainingJobsCount = await VehicleRequest.countDocuments({
        assignedDriver: driverId,
        status: RequestStatus.ASSIGNED
      });

      if (remainingJobsCount === 0) {
        await User.findByIdAndUpdate(driverId, {
          driverStatus: 'available'
        });
        console.log(`Şoför ${driverId} boşa çıktı, müsait durumuna getiriliyor.`);
      }
    }

    return NextResponse.json({ success: true, msg: 'İş havuzuna geri gönderildi.' }, { status: 200 });

  } catch (error) {
    console.error("Unassign Hatası:", error);
    return NextResponse.json({ msg: 'Sunucu Hatası' }, { status: 500 });
  }
}