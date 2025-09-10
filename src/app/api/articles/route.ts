import { withAuth, AuthRequest } from '@/middleware/auth';
import connectDB from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';

// GET - Get all articles
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
    
    // Only show published articles to public
    query.status = 'published';
    
    // Get Article model
    const ArticleModel = mongoose.models.Article || mongoose.model('Article', require('@/models/article.mode').default);
    
    // Get total count
    const total = await ArticleModel.countDocuments(query);
    
    // Get articles
    const articles = await ArticleModel.find(query)
      .populate('author', 'name image')
      .populate('category', 'name slug')
      .sort({ published_at: -1 })
      .skip(skip)
      .limit(limit);
    
    return NextResponse.json({
      success: true,
      message: 'Articles fetched successfully',
      data: {
        articles,
        pagination: {
          total,
          page,
          limit,
          pages: Math.ceil(total / limit),
        },
      },
    });
    
  } catch (error: any) {
    console.error('Get articles error:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST - Create a new article
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
      const status = formData.get('status') as string;
      const isFeatured = formData.get('is_featured') === 'true';
      const isPremium = formData.get('is_premium') === 'true';
      const thumbnail = formData.get('thumbnail') as File | null;
      const images = formData.getAll('images') as File[];
      const tags = formData.get('tags') as string;
      
      // Validate input
      if (!name || !content || !slug || !category) {
        return NextResponse.json(
          { success: false, message: 'Required fields are missing' },
          { status: 400 }
        );
      }
      
      // Get Article model
      const ArticleModel = mongoose.models.Article || mongoose.model('Article', require('@/models/article.mode').default);
      
      // Check if article with slug already exists
      const existingArticle = await ArticleModel.findOne({ slug, is_deleted: { $ne: true } });
      
      if (existingArticle) {
        return NextResponse.json(
          { success: false, message: 'An article with this slug already exists' },
          { status: 409 }
        );
      }
      
      // Handle thumbnail upload if provided
      let thumbnailUrl = undefined;
      if (thumbnail) {
        // In a real implementation, you would upload the image to a storage service
        // For now, we'll just simulate it
        thumbnailUrl = `/uploads/articles/${Date.now()}-${thumbnail.name}`;
      }
      
      // Handle multiple images upload if provided
      const imageUrls: string[] = [];
      if (images.length > 0) {
        // In a real implementation, you would upload the images to a storage service
        // For now, we'll just simulate it
        for (const image of images) {
          imageUrls.push(`/uploads/articles/${Date.now()}-${image.name}`);
        }
      }
      
      // Parse tags
      const parsedTags = tags ? tags.split(',').map(tag => tag.trim()) : [];
      
      // Set published_at if status is published
      const publishedAt = status === 'published' ? new Date() : undefined;
      
      // Create new article
      const newArticle = await ArticleModel.create({
        name,
        slug,
        description,
        content,
        thumbnail: thumbnailUrl,
        images: imageUrls,
        tags: parsedTags,
        category,
        author: req.user?.id,
        status,
        is_featured: isFeatured,
        is_premium: isPremium,
        published_at: publishedAt,
      });
      
      // Populate references
      await newArticle.populate('author', 'name image');
      await newArticle.populate('category', 'name slug');
      
      return NextResponse.json({
        success: true,
        message: 'Article created successfully',
        data: {
          article: newArticle,
        },
      });
      
    } catch (error: any) {
      console.error('Create article error:', error);
      return NextResponse.json(
        { success: false, message: error.message || 'Internal server error' },
        { status: 500 }
      );
    }
  });
}