'use client';

import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import Image from 'next/image';
import Link from 'next/link';
import { AppDispatch, RootState } from '@/redux/store';
import { fetchArticleBySlug } from '@/redux/features/article/articleActions';

export default function ArticleDetailPage({ params }: { params: { slug: string } }) {
  const { slug } = params;
  const dispatch = useDispatch<AppDispatch>();
  const { article, loading, error } = useSelector((state: RootState) => state.articles);

  useEffect(() => {
    if (slug) {
      dispatch(fetchArticleBySlug(slug));
    }
  }, [dispatch, slug]);

  if (loading) {
    return (
      <div className="min-h-screen flex justify-center items-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen p-4 md:p-8">
        <div className="container mx-auto text-center py-16">
          <h1 className="text-3xl font-bold mb-4">Error</h1>
          <p className="text-red-500 mb-8">{error}</p>
          <Link 
            href="/articles" 
            className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Back to Articles
          </Link>
        </div>
      </div>
    );
  }

  if (!article) {
    return (
      <div className="min-h-screen p-4 md:p-8">
        <div className="container mx-auto text-center py-16">
          <h1 className="text-3xl font-bold mb-4">Article Not Found</h1>
          <p className="mb-8">The article you're looking for doesn't exist or has been removed.</p>
          <Link 
            href="/articles" 
            className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Back to Articles
          </Link>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen p-4 md:p-8">
      <div className="container mx-auto max-w-4xl">
        {/* Breadcrumb */}
        <div className="flex items-center text-sm mb-6">
          <Link href="/" className="text-gray-500 hover:text-blue-600">Home</Link>
          <span className="mx-2">/</span>
          <Link href="/articles" className="text-gray-500 hover:text-blue-600">Articles</Link>
          <span className="mx-2">/</span>
          <span className="text-gray-900">{article.name}</span>
        </div>

        {/* Article Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-4">{article.name}</h1>
          
          <div className="flex flex-wrap items-center gap-4 mb-6">
            {/* Author */}
            {article.author && (
              <div className="flex items-center">
                {article.author.image ? (
                  <div className="relative w-10 h-10 rounded-full overflow-hidden mr-3">
                    <Image 
                      src={article.author.image} 
                      alt={article.author.name}
                      fill
                      className="object-cover"
                    />
                  </div>
                ) : (
                  <div className="w-10 h-10 rounded-full bg-gray-200 mr-3"></div>
                )}
                <span className="text-gray-700">{article.author.name}</span>
              </div>
            )}
            
            {/* Date */}
            {article.published_at && (
              <div className="text-gray-500">
                {new Date(article.published_at).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </div>
            )}
            
            {/* Category */}
            {article.category && (
              <Link 
                href={`/articles?category=${article.category._id}`}
                className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm"
              >
                {article.category.name}
              </Link>
            )}
            
            {/* Premium Badge */}
            {article.is_premium && (
              <span className="px-3 py-1 bg-yellow-100 text-yellow-800 text-sm rounded-full">
                Premium
              </span>
            )}
          </div>
          
          <p className="text-xl text-gray-600">{article.description}</p>
        </div>

        {/* Article Thumbnail */}
        {article.thumbnail && (
          <div className="relative w-full h-96 mb-8 rounded-lg overflow-hidden">
            <Image 
              src={article.thumbnail} 
              alt={article.name}
              fill
              className="object-cover"
            />
          </div>
        )}

        {/* Article Content */}
        <div className="prose max-w-none mb-12" dangerouslySetInnerHTML={{ __html: article.content }} />

        {/* Tags */}
        {article.tags && article.tags.length > 0 && (
          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-4">Tags</h2>
            <div className="flex flex-wrap gap-2">
              {article.tags.map((tag, index) => (
                <span 
                  key={index} 
                  className="bg-gray-100 text-gray-800 px-3 py-1 rounded-full text-sm"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Back to Articles */}
        <div className="mt-8">
          <Link 
            href="/articles" 
            className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Back to Articles
          </Link>
        </div>
      </div>
    </main>
  );
}