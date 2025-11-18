import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import connectToDatabase from '@/src/lib/db';
import VehicleRequest from '@/src/lib/models/VehicleRequest';
import { UserRole } from '@/src/lib/models/User';
import { getAuthenticatedUser } from '@/src/lib/auth';

export async function GET(request: NextRequest) {
  const { user, error } = getAuthenticatedUser(request);
  if (error) return error;

  if (user.role !== UserRole.DRIVER) {
      return NextResponse.json({ msg: 'Bu veriyi sadece şoförler görebilir.' }, { status: 403 });
  }

  try {
    await connectToDatabase();
    const myAssignments = await VehicleRequest.find({ 
        assignedDriver: user.id,
        status : 'assigned'
    })
    .populate('requestingUser', 'name email') 
    .sort({ startTime: 1 });

    return NextResponse.json(myAssignments, { status: 200 });

  } catch (error) {
    console.error("Assignments Error:", error);
    return NextResponse.json({ msg: 'Sunucu Hatası' }, { status: 500 });
  }
}