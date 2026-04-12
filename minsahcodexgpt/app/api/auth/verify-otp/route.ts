import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Mock OTP storage - shared with forgot-password route
const otpStorage = new Map<string, { otp: string; expiresAt: number }>();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, otp } = body;

    if (!email || !otp) {
      return NextResponse.json(
        { error: 'Email and OTP are required' },
        { status: 400 }
      );
    }

    // Check if OTP exists for this email
    const storedOtpData = otpStorage.get(email);

    if (!storedOtpData) {
      return NextResponse.json(
        { error: 'OTP not found or expired. Please request a new one.' },
        { status: 404 }
      );
    }

    // Check if OTP has expired
    if (Date.now() > storedOtpData.expiresAt) {
      otpStorage.delete(email);
      return NextResponse.json(
        { error: 'OTP has expired. Please request a new one.' },
        { status: 400 }
      );
    }

    // Verify OTP
    if (storedOtpData.otp !== otp) {
      return NextResponse.json(
        { error: 'Invalid OTP' },
        { status: 401 }
      );
    }

    // OTP is valid, generate reset token
    const resetToken = generateResetToken(email);

    // Remove used OTP
    otpStorage.delete(email);

    return NextResponse.json({
      message: 'OTP verified successfully',
      token: resetToken
    });

  } catch (error) {
    console.error('Error verifying OTP:', error);
    return NextResponse.json(
      { error: 'Failed to verify OTP' },
      { status: 500 }
    );
  }
}

function generateResetToken(email: string): string {
  // In production, use proper JWT library
  const payload = {
    email,
    purpose: 'password_reset',
    exp: Date.now() + (15 * 60 * 1000) // 15 minutes
  };
  return Buffer.from(JSON.stringify(payload)).toString('base64');
}
