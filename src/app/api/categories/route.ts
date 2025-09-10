import { withAuth, AuthRequest } from '@/middleware/auth';
import connectDB from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';

// GET - Get all categories
export async function GET(req: NextRequest) {
  try {
    await connectDB();
    
    // Get query parameters
    const url = new URL(req.url);
    const type = url.searchParams.get('type');
    
    // Build query
    const query: any = { is_deleted: { $ne: true } };
    
    if (type) {
      query.type = type;
    }
    
    // Get Category model
    const CategoryModel = mongoose.models.Category || mongoose.model('Category', require('@/models/category.model').default);
    
    // Get categories
    const categories = await CategoryModel.find(query).sort({ name: 1 });
    
    return NextResponse.json({
      success: true,
      message: 'Categories fetched successfully',
      data: {
        categories,
      },
    });
    
  } catch (error: any) {
    console.error('Get categories error:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST - Create a new category
export async function POST(req: AuthRequest) {
  return withAuth(req, async (req: AuthRequest) => {
    try {
      await connectDB();
      
      // Parse request body
      const body = await req.json();
      const { name, slug, description, type } = body;
      
      // Validate input
      if (!name || !slug || !type) {
        return NextResponse.json(
          { success: false, message: 'Required fields are missing' },
          { status: 400 }
        );
      }
      
      // Check if user has admin privileges
      if (req.user?.role !== 'admin') {
        return NextResponse.json(
          { success: false, message: 'Unauthorized to create categories' },
          { status: 403 }
        );
      }
      
      // Get Category model
      const CategoryModel = mongoose.models.Category || mongoose.model('Category', require('@/models/category.model').default);
      
      // Check if category with slug already exists
      const existingCategory = await CategoryModel.findOne({ slug, is_deleted: { $ne: true } });
      
      if (existingCategory) {
        return NextResponse.json(
          { success: false, message: 'A category with this slug already exists' },
          { status: 409 }
        );
      }
      
      // Create new category
      const newCategory = await CategoryModel.create({
        name,
        slug,
        description,
        type,
      });
      
      return NextResponse.json({
        success: true,
        message: 'Category created successfully',
        data: {
          category: newCategory,
        },
      });
      
    } catch (error: any) {
      console.error('Create category error:', error);
      return NextResponse.json(
        { success: false, message: error.message || 'Internal server error' },
        { status: 500 }
      );
    }
  });
}