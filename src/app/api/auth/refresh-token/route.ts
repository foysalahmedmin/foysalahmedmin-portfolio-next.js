import { ENV } from '@/config';
import connectDB from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';

export async function POST(req: NextRequest) {
  try {
    await connectDB();
    
    // Get refresh token from cookies
    const refreshToken = cookies().get('refreshToken')?.value;
    
    if (!refreshToken) {
      return NextResponse.json(
        { success: false, message: 'Refresh token not found' },
        { status: 401 }
      );
    }
    
    // Verify refresh token
    let decoded;
    try {
      decoded = jwt.verify(refreshToken, ENV.jwtRefreshSecret) as { id: string };
    } catch (error) {
      return NextResponse.json(
        { success: false, message: 'Invalid or expired refresh token' },
        { status: 401 }
      );
    }
    
    // Get User model
    const UserModel = mongoose.models.User || mongoose.model('User', require('@/models/user.model').default);
    
    // Find user by id
    const user = await UserModel.findOne({ _id: decoded.id, is_deleted: { $ne: true } });
    
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'User not found' },
        { status: 404 }
      );
    }
    
    // Check if user is blocked
    if (user.status === 'blocked') {
      return NextResponse.json(
        { success: false, message: 'Your account has been blocked' },
        { status: 403 }
      );
    }
    
    // Generate new access token
    const accessToken = jwt.sign(
      { id: user._id },
      ENV.jwtAccessSecret,
      { expiresIn: ENV.jwtAccessSecretExpiresIn }
    );
    
    // Generate new refresh token
    const newRefreshToken = jwt.sign(
      { id: user._id },
      ENV.jwtRefreshSecret,
      { expiresIn: ENV.jwtRefreshSecretExpiresIn }
    );
    
    // Set new refresh token cookie
    cookies().set('refreshToken', newRefreshToken, {
      httpOnly: true,
      secure: ENV.environment === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      path: '/',
    });
    
    return NextResponse.json({
      success: true,
      message: 'Token refreshed successfully',
      data: {
        user,
        accessToken,
      },
    });
    
  } catch (error: any) {
    console.error('Refresh token error:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}