import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import connectToDatabase from "@/src/lib/db";
import VehicleRequest from "@/src/lib/models/VehicleRequest";
import { RequestStatus } from "@/src/lib/models/VehicleRequest";
import { UserRole } from "@/src/lib/models/User";
import User from "@/src/lib/models/User";
import { getAuthenticatedUser } from "@/src/lib/auth";




export async function GET(Request:NextRequest) {
    
    
}