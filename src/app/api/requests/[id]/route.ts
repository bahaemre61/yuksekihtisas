import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import connectToDatabase from "@/src/lib/db";
import VehicleRequest, { RequestStatus } from "@/src/lib/models/VehicleRequest";
import { getAuthenticatedUser } from "@/src/lib/auth";
import User, {UserRole} from "@/src/lib/models/User";


export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { user, error } = getAuthenticatedUser(request);
    if (error) return error;
    try{
        const {id} = await params;
        const body = await request.json();

        await connectToDatabase();

        const existingRequest = await VehicleRequest.findById(id);
        if(!existingRequest){
            return NextResponse.json({msg : 'Talep bulunamadı.'}, {status : 404});
        }

        const oldDriverId = existingRequest.assignedDriver;

        const updatedRequest = await VehicleRequest.findByIdAndUpdate(
            id,
            body,
            {new: true}
        );

        if(oldDriverId)
        {
            const isUnassigned = 
            (body.status === RequestStatus.PENDING) ||
            (body.assignedDriver === null) ||
            (body.assignedDriver === undefined && body.status === RequestStatus.PENDING);
            if (isUnassigned) {
            console.log(`Talep boşa çıkarıldı. Eski şoför (${oldDriverId}) kontrol ediliyor...`);

            const remainingJobs = await VehicleRequest.countDocuments({
                assignedDriver: oldDriverId,
                status: RequestStatus.ASSIGNED,
                _id: { $ne: id } 
            });

            if (remainingJobs === 0) {
                await User.findByIdAndUpdate(oldDriverId, { driverStatus: 'available' });
                console.log("-> Şoförün başka işi kalmadığı için 'Müsait' yapıldı.");
            } else {
                console.log(`-> Şoförün hala ${remainingJobs} işi var, 'Meşgul' kalmaya devam ediyor.`);
            }
        }
    }

    return NextResponse.json(updatedRequest, { status: 200 });

  } catch (error) {
    console.error("Güncelleme Hatası:", error);
    return NextResponse.json({ msg: 'Güncelleme başarısız' }, { status: 500 });
  }
        }