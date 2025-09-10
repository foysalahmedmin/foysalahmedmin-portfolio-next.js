import { withAuth, AuthRequest } from '@/middleware/auth';
import connectDB from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';

// GET - Get a project by slug
export async function GET(req: NextRequest, { params }: { params: { slug: string } }) {
  try {
    await connectDB();
    
    const { slug } = params;
    
    // Get Project model
    const ProjectModel = mongoose.models.Project || mongoose.model('Project', require('@/models/project.model').default);
    
    // Find project by slug
    const project = await ProjectModel.findOne({ slug, is_deleted: { $ne: true } })
      .populate('author', 'name image')
      .populate('category', 'name slug')
      .populate('collaborators', 'name image');
    
    if (!project) {
      return NextResponse.json(
        { success: false, message: 'Project not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      message: 'Project fetched successfully',
      data: {
        project,
      },
    });
    
  } catch (error: any) {
    console.error('Get project error:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT - Update a project
export async function PUT(req: AuthRequest, { params }: { params: { slug: string } }) {
  return withAuth(req, async (req: AuthRequest) => {
    try {
      await connectDB();
      
      const { slug } = params;
      
      // Parse form data
      const formData = await req.formData();
      const name = formData.get('name') as string;
      const description = formData.get('description') as string;
      const content = formData.get('content') as string;
      const newSlug = formData.get('slug') as string;
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
      
      // Get Project model
      const ProjectModel = mongoose.models.Project || mongoose.model('Project', require('@/models/project.model').default);
      
      // Find project by slug
      const project = await ProjectModel.findOne({ slug, is_deleted: { $ne: true } });
      
      if (!project) {
        return NextResponse.json(
          { success: false, message: 'Project not found' },
          { status: 404 }
        );
      }
      
      // Check if user is author or has permission
      if (project.author.toString() !== req.user?.id) {
        return NextResponse.json(
          { success: false, message: 'You do not have permission to update this project' },
          { status: 403 }
        );
      }
      
      // Check if new slug is already taken (if changed)
      if (newSlug && newSlug !== slug) {
        const existingProject = await ProjectModel.findOne({ slug: newSlug, is_deleted: { $ne: true } });
        
        if (existingProject) {
          return NextResponse.json(
            { success: false, message: 'A project with this slug already exists' },
            { status: 409 }
          );
        }
      }
      
      // Handle thumbnail upload if provided
      let thumbnailUrl = project.thumbnail;
      if (thumbnail) {
        // In a real implementation, you would upload the image to a storage service
        // For now, we'll just simulate it
        thumbnailUrl = `/uploads/projects/${Date.now()}-${thumbnail.name}`;
      }
      
      // Handle multiple images upload if provided
      let imageUrls = project.images || [];
      if (images.length > 0) {
        // In a real implementation, you would upload the images to a storage service
        // For now, we'll just simulate it
        imageUrls = [];
        for (const image of images) {
          imageUrls.push(`/uploads/projects/${Date.now()}-${image.name}`);
        }
      }
      
      // Parse tags
      const parsedTags = tags ? tags.split(',').map(tag => tag.trim()) : project.tags;
      
      // Update project
      const updatedProject = await ProjectModel.findOneAndUpdate(
        { slug, is_deleted: { $ne: true } },
        {
          name: name || project.name,
          slug: newSlug || project.slug,
          description: description !== undefined ? description : project.description,
          content: content || project.content,
          thumbnail: thumbnailUrl,
          images: imageUrls,
          tags: parsedTags,
          category: category || project.category,
          client: client || project.client,
          status: status || project.status,
          is_featured: isFeatured !== undefined ? isFeatured : project.is_featured,
          is_premium: isPremium !== undefined ? isPremium : project.is_premium,
          started_at: startedAt || project.started_at,
          ended_at: endedAt || project.ended_at,
        },
        { new: true }
      )
        .populate('author', 'name image')
        .populate('category', 'name slug')
        .populate('collaborators', 'name image');
      
      return NextResponse.json({
        success: true,
        message: 'Project updated successfully',
        data: {
          project: updatedProject,
        },
      });
      
    } catch (error: any) {
      console.error('Update project error:', error);
      return NextResponse.json(
        { success: false, message: error.message || 'Internal server error' },
        { status: 500 }
      );
    }
  });
}

// DELETE - Delete a project
export async function DELETE(req: AuthRequest, { params }: { params: { slug: string } }) {
  return withAuth(req, async (req: AuthRequest) => {
    try {
      await connectDB();
      
      const { slug } = params;
      
      // Get Project model
      const ProjectModel = mongoose.models.Project || mongoose.model('Project', require('@/models/project.model').default);
      
      // Find project by slug
      const project = await ProjectModel.findOne({ slug, is_deleted: { $ne: true } });
      
      if (!project) {
        return NextResponse.json(
          { success: false, message: 'Project not found' },
          { status: 404 }
        );
      }
      
      // Check if user is author or has permission
      if (project.author.toString() !== req.user?.id) {
        return NextResponse.json(
          { success: false, message: 'You do not have permission to delete this project' },
          { status: 403 }
        );
      }
      
      // Soft delete project
      await ProjectModel.findOneAndUpdate(
        { slug, is_deleted: { $ne: true } },
        { is_deleted: true }
      );
      
      return NextResponse.json({
        success: true,
        message: 'Project deleted successfully',
      });
      
    } catch (error: any) {
      console.error('Delete project error:', error);
      return NextResponse.json(
        { success: false, message: error.message || 'Internal server error' },
        { status: 500 }
      );
    }
  });
}