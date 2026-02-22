import { NextResponse } from "next/server";
import connectToDatabase from "@/src/lib/db";
import VehicleRequest from "@/src/lib/models/VehicleRequest";
import { getAuthenticatedUser } from "@/src/lib/auth";

export async function GET(request:Request) {
    const {user, error} = getAuthenticatedUser(request as any);
    if(error) return error;

    try{
        await connectToDatabase();
  const tasks = await VehicleRequest.find({ 
    assignedDriver: user.id, 
    status: 'assigned' 
  }).populate('requestingUser', 'name email')
  .lean();

  const grouped = tasks.reduce((acc: any, task: any) => {
    const key = task.batchId || 'single';
    if (!acc[key]) acc[key] = { title: `${task.toLocation} Seferi`, requests: [] };
    acc[key].requests.push(task);
    return acc;
  } , {});

  return NextResponse.json(Object.values(grouped))
    }catch(error){
        console.error("My Tasks Error:", error);
        return NextResponse.json({msg : 'Sunucu Hatası'}, {status : 500});
    }   
}