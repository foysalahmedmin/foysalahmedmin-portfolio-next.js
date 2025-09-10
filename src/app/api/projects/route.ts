import { withAuth, AuthRequest } from '@/middleware/auth';
import connectDB from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';

// GET - Get all projects
export async function GET(req: NextRequest) {
  try {
    await connectDB();
    
    // Get query parameters
    const url = new URL(req.url);
    const featured = url.searchParams.get('featured');
    const category = url.searchParams.get('category');
    const limit = parseInt(url.searchParams.get('limit') || '10');
    const page = parseInt(url.searchParams.get('page') || '1');
    const skip = (page - 1) * limit;
    
    // Build query
    const query: any = { is_deleted: { $ne: true } };
    
    if (featured === 'true') {
      query.is_featured = true;
    }
    
    if (category) {
      query.category = category;
    }
    
    // Get Project model
    const ProjectModel = mongoose.models.Project || mongoose.model('Project', require('@/models/project.model').default);
    
    // Get total count
    const total = await ProjectModel.countDocuments(query);
    
    // Get projects
    const projects = await ProjectModel.find(query)
      .populate('author', 'name image')
      .populate('category', 'name slug')
      .sort({ created_at: -1 })
      .skip(skip)
      .limit(limit);
    
    return NextResponse.json({
      success: true,
      message: 'Projects fetched successfully',
      data: {
        projects,
        pagination: {
          total,
          page,
          limit,
          pages: Math.ceil(total / limit),
        },
      },
    });
    
  } catch (error: any) {
    console.error('Get projects error:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST - Create a new project
export async function POST(req: AuthRequest) {
  return withAuth(req, async (req: AuthRequest) => {
    try {
      await connectDB();
      
      // Parse form data
      const formData = await req.formData();
      const name = formData.get('name') as string;
      const description = formData.get('description') as string;
      const content = formData.get('content') as string;
      const slug = formData.get('slug') as string;
      const category = formData.get('category') as string;
      const client = formData.get('client') as string;
      const status = formData.get('status') as string;
      const isFeatured = formData.get('is_featured') === 'true';
      const isPremium = formData.get('is_premium') === 'true';
      const startedAt = formData.get('started_at') as string;
      const endedAt = formData.get('ended_at') as string;
      const thumbnail = formData.get('thumbnail') as File | null;
      const images = formData.getAll('images') as File[];
      const tags = formData.get('tags') as string;
      
      // Validate input
      if (!name || !content || !slug || !category || !client) {
        return NextResponse.json(
          { success: false, message: 'Required fields are missing' },
          { status: 400 }
        );
      }
      
      // Get Project model
      const ProjectModel = mongoose.models.Project || mongoose.model('Project', require('@/models/project.model').default);
      
      // Check if project with slug already exists
      const existingProject = await ProjectModel.findOne({ slug, is_deleted: { $ne: true } });
      
      if (existingProject) {
        return NextResponse.json(
          { success: false, message: 'A project with this slug already exists' },
          { status: 409 }
        );
      }
      
      // Handle thumbnail upload if provided
      let thumbnailUrl = undefined;
      if (thumbnail) {
        // In a real implementation, you would upload the image to a storage service
        // For now, we'll just simulate it
        thumbnailUrl = `/uploads/projects/${Date.now()}-${thumbnail.name}`;
      }
      
      // Handle multiple images upload if provided
      const imageUrls: string[] = [];
      if (images.length > 0) {
        // In a real implementation, you would upload the images to a storage service
        // For now, we'll just simulate it
        for (const image of images) {
          imageUrls.push(`/uploads/projects/${Date.now()}-${image.name}`);
        }
      }
      
      // Parse tags
      const parsedTags = tags ? tags.split(',').map(tag => tag.trim()) : [];
      
      // Create new project
      const newProject = await ProjectModel.create({
        name,
        slug,
        description,
        content,
        thumbnail: thumbnailUrl,
        images: imageUrls,
        tags: parsedTags,
        category,
        author: req.user?.id,
        client,
        status,
        is_featured: isFeatured,
        is_premium: isPremium,
        started_at: startedAt || undefined,
        ended_at: endedAt || undefined,
      });
      
      // Populate references
      await newProject.populate('author', 'name image');
      await newProject.populate('category', 'name slug');
      
      return NextResponse.json({
        success: true,
        message: 'Project created successfully',
        data: {
          project: newProject,
        },
      });
      
    } catch (error: any) {
      console.error('Create project error:', error);
      return NextResponse.json(
        { success: false, message: error.message || 'Internal server error' },
        { status: 500 }
      );
    }
  });
}