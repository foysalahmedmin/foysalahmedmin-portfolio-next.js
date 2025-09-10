import { withAuth, AuthRequest } from '@/middleware/auth';
import connectDB from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';

// GET - Get category by slug
export async function GET(req: NextRequest, { params }: { params: { slug: string } }) {
  try {
    await connectDB();
    
    const { slug } = params;
    
    // Get Category model
    const CategoryModel = mongoose.models.Category || mongoose.model('Category', require('@/models/category.model').default);
    
    // Find category by slug
    const category = await CategoryModel.findOne({ slug, is_deleted: { $ne: true } });
    
    if (!category) {
      return NextResponse.json(
        { success: false, message: 'Category not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      message: 'Category fetched successfully',
      data: {
        category,
      },
    });
    
  } catch (error: any) {
    console.error('Get category error:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT - Update category
export async function PUT(req: AuthRequest, { params }: { params: { slug: string } }) {
  return withAuth(req, async (req: AuthRequest) => {
    try {
      await connectDB();
      
      const { slug } = params;
      
      // Parse request body
      const body = await req.json();
      const { name, newSlug, description, type } = body;
      
      // Validate input
      if (!name || !newSlug || !type) {
        return NextResponse.json(
          { success: false, message: 'Required fields are missing' },
          { status: 400 }
        );
      }
      
      // Check if user has admin privileges
      if (req.user?.role !== 'admin') {
        return NextResponse.json(
          { success: false, message: 'Unauthorized to update categories' },
          { status: 403 }
        );
      }
      
      // Get Category model
      const CategoryModel = mongoose.models.Category || mongoose.model('Category', require('@/models/category.model').default);
      
      // Find category by slug
      const category = await CategoryModel.findOne({ slug, is_deleted: { $ne: true } });
      
      if (!category) {
        return NextResponse.json(
          { success: false, message: 'Category not found' },
          { status: 404 }
        );
      }
      
      // Check if new slug is different and already exists
      if (newSlug !== slug) {
        const existingCategory = await CategoryModel.findOne({ slug: newSlug, is_deleted: { $ne: true } });
        
        if (existingCategory) {
          return NextResponse.json(
            { success: false, message: 'A category with this slug already exists' },
            { status: 409 }
          );
        }
      }
      
      // Update category
      const updatedCategory = await CategoryModel.findOneAndUpdate(
        { slug, is_deleted: { $ne: true } },
        {
          name,
          slug: newSlug,
          description,
          type,
          updated_at: new Date(),
        },
        { new: true }
      );
      
      return NextResponse.json({
        success: true,
        message: 'Category updated successfully',
        data: {
          category: updatedCategory,
        },
      });
      
    } catch (error: any) {
      console.error('Update category error:', error);
      return NextResponse.json(
        { success: false, message: error.message || 'Internal server error' },
        { status: 500 }
      );
    }
  });
}

// DELETE - Delete category (soft delete)
export async function DELETE(req: AuthRequest, { params }: { params: { slug: string } }) {
  return withAuth(req, async (req: AuthRequest) => {
    try {
      await connectDB();
      
      const { slug } = params;
      
      // Check if user has admin privileges
      if (req.user?.role !== 'admin') {
        return NextResponse.json(
          { success: false, message: 'Unauthorized to delete categories' },
          { status: 403 }
        );
      }
      
      // Get Category model
      const CategoryModel = mongoose.models.Category || mongoose.model('Category', require('@/models/category.model').default);
      
      // Find category by slug
      const category = await CategoryModel.findOne({ slug, is_deleted: { $ne: true } });
      
      if (!category) {
        return NextResponse.json(
          { success: false, message: 'Category not found' },
          { status: 404 }
        );
      }
      
      // Check if category is being used by any articles or projects
      const ArticleModel = mongoose.models.Article || mongoose.model('Article', require('@/models/article.mode').default);
      const ProjectModel = mongoose.models.Project || mongoose.model('Project', require('@/models/project.model').default);
      
      const articlesUsingCategory = await ArticleModel.countDocuments({ category: category._id, is_deleted: { $ne: true } });
      const projectsUsingCategory = await ProjectModel.countDocuments({ category: category._id, is_deleted: { $ne: true } });
      
      if (articlesUsingCategory > 0 || projectsUsingCategory > 0) {
        return NextResponse.json(
          { 
            success: false, 
            message: 'Cannot delete category as it is being used by articles or projects',
            data: {
              articlesCount: articlesUsingCategory,
              projectsCount: projectsUsingCategory
            }
          },
          { status: 400 }
        );
      }
      
      // Soft delete category
      await CategoryModel.findOneAndUpdate(
        { slug },
        {
          is_deleted: true,
          deleted_at: new Date(),
        }
      );
      
      return NextResponse.json({
        success: true,
        message: 'Category deleted successfully',
      });
      
    } catch (error: any) {
      console.error('Delete category error:', error);
      return NextResponse.json(
        { success: false, message: error.message || 'Internal server error' },
        { status: 500 }
      );
    }
  });
}