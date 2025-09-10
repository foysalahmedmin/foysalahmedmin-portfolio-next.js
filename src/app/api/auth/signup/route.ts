import { ENV } from '@/config';
import connectDB from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';

export async function POST(req: NextRequest) {
  try {
    await connectDB();
    
    // Parse form data
    const formData = await req.formData();
    const name = formData.get('name') as string;
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;
    const image = formData.get('image') as File | null;
    
    // Validate input
    if (!name || !email || !password) {
      return NextResponse.json(
        { success: false, message: 'Name, email, and password are required' },
        { status: 400 }
      );
    }
    
    // Get User model
    const UserModel = mongoose.models.User || mongoose.model('User', require('@/models/user.model').default);
    
    // Check if user already exists
    const existingUser = await UserModel.findOne({ email, is_deleted: { $ne: true } });
    
    if (existingUser) {
      return NextResponse.json(
        { success: false, message: 'Email already in use' },
        { status: 409 }
      );
    }
    
    // Handle image upload if provided
    let imageUrl = undefined;
    if (image) {
      // In a real implementation, you would upload the image to a storage service
      // For now, we'll just simulate it
      imageUrl = `/uploads/users/${Date.now()}-${image.name}`;
    }
    
    // Create new user
    const newUser = await UserModel.create({
      name,
      email,
      password,
      image: imageUrl,
      role: 'user', // Default role for new signups
      is_verified: false,
    });
    
    // Generate verification token
    const verificationToken = jwt.sign(
      { id: newUser._id },
      ENV.jwtEmailVerificationSecret,
      { expiresIn: ENV.jwtEmailVerificationSecretExpiresIn }
    );
    
    // In a real implementation, you would send a verification email here
    // For now, we'll just return the token in the response
    
    return NextResponse.json({
      success: true,
      message: 'Account created successfully. Please verify your email.',
      data: {
        user: newUser,
        verificationToken,
      },
    });
    
  } catch (error: any) {
    console.error('Sign up error:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}