import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Mock OTP storage - in production, use Redis or database
const otpStorage = new Map<string, { otp: string; expiresAt: number }>();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = body;

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Store OTP with 10-minute expiration
    otpStorage.set(email, {
      otp,
      expiresAt: Date.now() + (10 * 60 * 1000) // 10 minutes
    });

    // In production, send OTP via email service (e.g., SendGrid, AWS SES)
    console.log(`OTP for ${email}: ${otp}`);

    return NextResponse.json({
      message: 'OTP sent successfully',
      email,
      // In production, don't send OTP in response
      // This is for development/testing only
      otp: process.env.NODE_ENV === 'development' ? otp : undefined
    });

  } catch (error) {
    console.error('Error sending OTP:', error);
    return NextResponse.json(
      { error: 'Failed to send OTP' },
      { status: 500 }
    );
  }
}

// Export OTP storage for verification route
export { otpStorage };
