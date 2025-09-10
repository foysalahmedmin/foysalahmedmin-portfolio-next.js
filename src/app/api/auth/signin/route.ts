import { ENV } from '@/config';
import connectDB from '@/lib/db';
import { TUserDocument } from '@/types/user.type';
import bcrypt from 'bcrypt';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';

export async function POST(req: NextRequest) {
  try {
    await connectDB();
    
    const { email, password } = await req.json();
    
    // Validate input
    if (!email || !password) {
      return NextResponse.json(
        { success: false, message: 'Email and password are required' },
        { status: 400 }
      );
    }
    
    // Get User model
    const UserModel = mongoose.models.User || mongoose.model('User', require('@/models/user.model').default);
    
    // Find user by email
    const user = await UserModel.findOne({ email, is_deleted: { $ne: true } }).select('+password');
    
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Invalid email or password' },
        { status: 401 }
      );
    }
    
    // Check if user is blocked
    if (user.status === 'blocked') {
      return NextResponse.json(
        { success: false, message: 'Your account has been blocked' },
        { status: 403 }
      );
    }
    
    // Check password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    
    if (!isPasswordValid) {
      return NextResponse.json(
        { success: false, message: 'Invalid email or password' },
        { status: 401 }
      );
    }
    
    // Generate tokens
    const accessToken = jwt.sign(
      { id: user._id },
      ENV.jwtAccessSecret,
      { expiresIn: ENV.jwtAccessSecretExpiresIn }
    );
    
    const refreshToken = jwt.sign(
      { id: user._id },
      ENV.jwtRefreshSecret,
      { expiresIn: ENV.jwtRefreshSecretExpiresIn }
    );
    
    // Set cookies
    cookies().set('refreshToken', refreshToken, {
      httpOnly: true,
      secure: ENV.environment === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      path: '/',
    });
    
    return NextResponse.json({
      success: true,
      message: 'Sign in successful',
      data: {
        user,
        accessToken,
      },
    });
    
  } catch (error: any) {
    console.error('Sign in error:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}