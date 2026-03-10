import { NextResponse } from 'next/server';
import connectToDatabase from "@/src/lib/db";
import User from "@/src/lib/models/User";
import { getAuthenticatedUser } from "@/src/lib/auth";

export async function POST(req: Request) {
  try {
    await connectToDatabase();
    const { user, error } = getAuthenticatedUser(req as any);
    if (error) return error;

    const subscription = await req.json();

    await User.findByIdAndUpdate(user.id, {
      pushSubscription: subscription
    });

    return NextResponse.json({ success: true, message: "Bildirim kaydı başarılı." });
  } catch (err: any) {
    return NextResponse.json({ error: "Kayıt hatası" }, { status: 500 });
  }
}