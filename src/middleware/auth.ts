import { ENV } from '@/config';
import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';

export interface AuthRequest extends NextRequest {
  user?: {
    id: string;
  };
}

export async function withAuth(
  req: AuthRequest,
  handler: (req: AuthRequest) => Promise<NextResponse>
) {
  try {
    // Get authorization header
    const authHeader = req.headers.get('authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized: No token provided' },
        { status: 401 }
      );
    }
    
    // Extract token
    const token = authHeader.split(' ')[1];
    
    if (!token) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized: No token provided' },
        { status: 401 }
      );
    }
    
    try {
      // Verify token
      const decoded = jwt.verify(token, ENV.jwtAccessSecret) as { id: string };
      
      // Attach user to request
      req.user = {
        id: decoded.id,
      };
      
      // Call the handler
      return await handler(req);
      
    } catch (error) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized: Invalid token' },
        { status: 401 }
      );
    }
    
  } catch (error: any) {
    console.error('Auth middleware error:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}