'use client';

import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import Link from 'next/link';
import Image from 'next/image';
import { AppDispatch, RootState } from '@/redux/store';
import { fetchArticles } from '@/redux/features/article/articleActions';
import { fetchCategories } from '@/redux/features/category/categoryActions';

export default function ArticlesPage() {
  const dispatch = useDispatch<AppDispatch>();
  const { articles, pagination, loading } = useSelector((state: RootState) => state.articles);
  const { categories } = useSelector((state: RootState) => state.categories);
  
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [currentPage, setCurrentPage] = useState<number>(1);
  
  useEffect(() => {
    dispatch(fetchCategories('article'));
  }, [dispatch]);
  
  useEffect(() => {
    const params: { page: number; category?: string } = { page: currentPage };
    
    if (selectedCategory) {
      params.category = selectedCategory;
    }
    
    dispatch(fetchArticles(params));
  }, [dispatch, currentPage, selectedCategory]);
  
  const handleCategoryChange = (categoryId: string) => {
    setSelectedCategory(categoryId === selectedCategory ? '' : categoryId);
    setCurrentPage(1);
  };
  
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  
  return (
    <main className="min-h-screen p-4 md:p-8">
      <section className="py-8 md:py-12">
        <div className="container mx-auto">
          <h1 className="text-4xl font-bold mb-8">Articles</h1>
          
          {/* Category Filter */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-4">Filter by Category</h2>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => {
                  setSelectedCategory('');
                  setCurrentPage(1);
                }}
                className={`px-4 py-2 rounded-md ${!selectedCategory ? 'bg-blue-600 text-white' : 'bg-gray-200 hover:bg-gray-300'}`}
              >
                All
              </button>
              {categories?.filter(cat => cat.type === 'article').map((category) => (
                <button
                  key={category._id}
                  onClick={() => handleCategoryChange(category._id)}
                  className={`px-4 py-2 rounded-md ${selectedCategory === category._id ? 'bg-blue-600 text-white' : 'bg-gray-200 hover:bg-gray-300'}`}
                >
                  {category.name}
                </button>
              ))}
            </div>
          </div>
          
          {/* Articles Grid */}
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {articles?.map((article) => (
                <div key={article._id} className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow">
                  <div className="relative h-48">
                    {article.thumbnail ? (
                      <Image 
                        src={article.thumbnail} 
                        alt={article.name}
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                        <span className="text-gray-400">No Image</span>
                      </div>
                    )}
                    {article.is_premium && (
                      <div className="absolute top-2 right-2">
                        <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded-full">
                          Premium
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="p-4">
                    <h3 className="text-xl font-semibold mb-2">{article.name}</h3>
                    <p className="text-gray-600 mb-4 line-clamp-2">{article.description}</p>
                    <div className="flex justify-between items-center">
                      <Link 
                        href={`/articles/${article.slug}`}
                        className="text-blue-600 hover:underline"
                      >
                        Read More
                      </Link>
                      {article.author && (
                        <div className="flex items-center">
                          {article.author.image ? (
                            <div className="relative w-6 h-6 rounded-full overflow-hidden mr-2">
                              <Image 
                                src={article.author.image} 
                                alt={article.author.name}
                                fill
                                className="object-cover"
                              />
                            </div>
                          ) : (
                            <div className="w-6 h-6 rounded-full bg-gray-200 mr-2"></div>
                          )}
                          <span className="text-sm text-gray-500">{article.author.name}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              
              {articles?.length === 0 && (
                <div className="col-span-full text-center py-12">
                  <p className="text-gray-500">No articles found.</p>
                </div>
              )}
            </div>
          )}
          
          {/* Pagination */}
          {pagination && pagination.pages > 1 && (
            <div className="flex justify-center mt-8">
              <div className="flex space-x-2">
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className={`px-4 py-2 rounded-md ${currentPage === 1 ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'bg-gray-200 hover:bg-gray-300'}`}
                >
                  Previous
                </button>
                
                {Array.from({ length: pagination.pages }, (_, i) => i + 1).map((page) => (
                  <button
                    key={page}
                    onClick={() => handlePageChange(page)}
                    className={`px-4 py-2 rounded-md ${currentPage === page ? 'bg-blue-600 text-white' : 'bg-gray-200 hover:bg-gray-300'}`}
                  >
                    {page}
                  </button>
                ))}
                
                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === pagination.pages}
                  className={`px-4 py-2 rounded-md ${currentPage === pagination.pages ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'bg-gray-200 hover:bg-gray-300'}`}
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}