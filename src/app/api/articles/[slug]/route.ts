import { withAuth, AuthRequest } from '@/middleware/auth';
import connectDB from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';

// GET - Get article by slug
export async function GET(req: NextRequest, { params }: { params: { slug: string } }) {
  try {
    await connectDB();
    
    const { slug } = params;
    
    // Get Article model
    const ArticleModel = mongoose.models.Article || mongoose.model('Article', require('@/models/article.mode').default);
    
    // Find article by slug
    const article = await ArticleModel.findOne({ slug, is_deleted: { $ne: true } })
      .populate('author', 'name image')
      .populate('category', 'name slug');
    
    if (!article) {
      return NextResponse.json(
        { success: false, message: 'Article not found' },
        { status: 404 }
      );
    }
    
    // Increment views count
    article.views = (article.views || 0) + 1;
    await article.save();
    
    return NextResponse.json({
      success: true,
      message: 'Article fetched successfully',
      data: {
        article,
      },
    });
    
  } catch (error: any) {
    console.error('Get article error:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT - Update article
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
      const status = formData.get('status') as string;
      const isFeatured = formData.get('is_featured') === 'true';
      const isPremium = formData.get('is_premium') === 'true';
      const thumbnail = formData.get('thumbnail') as File | null;
      const images = formData.getAll('images') as File[];
      const tags = formData.get('tags') as string;
      
      // Validate input
      if (!name || !content || !newSlug || !category) {
        return NextResponse.json(
          { success: false, message: 'Required fields are missing' },
          { status: 400 }
        );
      }
      
      // Get Article model
      const ArticleModel = mongoose.models.Article || mongoose.model('Article', require('@/models/article.mode').default);
      
      // Find article by slug
      const article = await ArticleModel.findOne({ slug, is_deleted: { $ne: true } });
      
      if (!article) {
        return NextResponse.json(
          { success: false, message: 'Article not found' },
          { status: 404 }
        );
      }
      
      // Check if user is the author or has admin privileges
      if (article.author.toString() !== req.user?.id && req.user?.role !== 'admin') {
        return NextResponse.json(
          { success: false, message: 'Unauthorized to update this article' },
          { status: 403 }
        );
      }
      
      // Check if new slug is different and already exists
      if (newSlug !== slug) {
        const existingArticle = await ArticleModel.findOne({ slug: newSlug, is_deleted: { $ne: true } });
        
        if (existingArticle) {
          return NextResponse.json(
            { success: false, message: 'An article with this slug already exists' },
            { status: 409 }
          );
        }
      }
      
      // Handle thumbnail upload if provided
      let thumbnailUrl = article.thumbnail;
      if (thumbnail) {
        // In a real implementation, you would upload the image to a storage service
        // For now, we'll just simulate it
        thumbnailUrl = `/uploads/articles/${Date.now()}-${thumbnail.name}`;
      }
      
      // Handle multiple images upload if provided
      let imageUrls = article.images || [];
      if (images.length > 0) {
        // In a real implementation, you would upload the images to a storage service
        // For now, we'll just simulate it
        imageUrls = [];
        for (const image of images) {
          imageUrls.push(`/uploads/articles/${Date.now()}-${image.name}`);
        }
      }
      
      // Parse tags
      const parsedTags = tags ? tags.split(',').map(tag => tag.trim()) : [];
      
      // Set published_at if status is changing to published
      let publishedAt = article.published_at;
      if (status === 'published' && article.status !== 'published') {
        publishedAt = new Date();
      }
      
      // Update article
      const updatedArticle = await ArticleModel.findOneAndUpdate(
        { slug, is_deleted: { $ne: true } },
        {
          name,
          slug: newSlug,
          description,
          content,
          thumbnail: thumbnailUrl,
          images: imageUrls,
          tags: parsedTags,
          category,
          status,
          is_featured: isFeatured,
          is_premium: isPremium,
          published_at: publishedAt,
          updated_at: new Date(),
        },
        { new: true }
      )
        .populate('author', 'name image')
        .populate('category', 'name slug');
      
      return NextResponse.json({
        success: true,
        message: 'Article updated successfully',
        data: {
          article: updatedArticle,
        },
      });
      
    } catch (error: any) {
      console.error('Update article error:', error);
      return NextResponse.json(
        { success: false, message: error.message || 'Internal server error' },
        { status: 500 }
      );
    }
  });
}

// DELETE - Delete article (soft delete)
export async function DELETE(req: AuthRequest, { params }: { params: { slug: string } }) {
  return withAuth(req, async (req: AuthRequest) => {
    try {
      await connectDB();
      
      const { slug } = params;
      
      // Get Article model
      const ArticleModel = mongoose.models.Article || mongoose.model('Article', require('@/models/article.mode').default);
      
      // Find article by slug
      const article = await ArticleModel.findOne({ slug, is_deleted: { $ne: true } });
      
      if (!article) {
        return NextResponse.json(
          { success: false, message: 'Article not found' },
          { status: 404 }
        );
      }
      
      // Check if user is the author or has admin privileges
      if (article.author.toString() !== req.user?.id && req.user?.role !== 'admin') {
        return NextResponse.json(
          { success: false, message: 'Unauthorized to delete this article' },
          { status: 403 }
        );
      }
      
      // Soft delete article
      await ArticleModel.findOneAndUpdate(
        { slug },
        {
          is_deleted: true,
          deleted_at: new Date(),
        }
      );
      
      return NextResponse.json({
        success: true,
        message: 'Article deleted successfully',
      });
      
    } catch (error: any) {
      console.error('Delete article error:', error);
      return NextResponse.json(
        { success: false, message: error.message || 'Internal server error' },
        { status: 500 }
      );
    }
  });
}