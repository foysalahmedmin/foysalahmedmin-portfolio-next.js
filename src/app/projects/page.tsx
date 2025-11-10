'use client';

import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import Link from 'next/link';
import Image from 'next/image';
import { AppDispatch, RootState } from '@/redux/store';
import { fetchProjects } from '@/redux/features/project/projectActions';
import { fetchProjectCategories } from '@/redux/features/category/categoryActions';

export default function ProjectsPage() {
  const dispatch = useDispatch<AppDispatch>();
  const { projects, pagination, loading } = useSelector(
    (state: RootState) => state.projects
  );
  const { projectCategories } = useSelector(
    (state: RootState) => state.categories
  );

  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [currentPage, setCurrentPage] = useState<number>(1);

  useEffect(() => {
    dispatch(fetchProjectCategories());
  }, [dispatch]);

  useEffect(() => {
    const params: { page: number; category?: string } = { page: currentPage };

    if (selectedCategory) {
      params.category = selectedCategory;
    }

    dispatch(fetchProjects(params));
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
          <h1 className="text-4xl font-bold mb-8">Projects</h1>

          {/* Category Filter */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-4">Filter by Category</h2>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => {
                  setSelectedCategory('');
                  setCurrentPage(1);
                }}
                className={`px-4 py-2 rounded-md ${
                  !selectedCategory
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 hover:bg-gray-300'
                }`}
              >
                All
              </button>
              {projectCategories?.map((category) => (
                <button
                  key={category._id}
                  onClick={() => handleCategoryChange(category._id.toString())}
                  className={`px-4 py-2 rounded-md ${
                    selectedCategory === category._id.toString()
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 hover:bg-gray-300'
                  }`}
                >
                  {category.name}
                </button>
              ))}
            </div>
          </div>

          {/* Projects Grid */}
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {projects?.map((project) => (
                <div
                  key={project._id.toString()}
                  className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow"
                >
                  <div className="relative h-48">
                    {project.thumbnail ? (
                      <Image
                        src={project.thumbnail}
                        alt={project.name}
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                        <span className="text-gray-400">No Image</span>
                      </div>
                    )}
                  </div>
                  <div className="p-4">
                    <h3 className="text-xl font-semibold mb-2">
                      {project.name}
                    </h3>
                    <p className="text-gray-600 mb-4 line-clamp-2">
                      {project.description}
                    </p>
                    <Link
                      href={`/projects/${project.slug}`}
                      className="text-blue-600 hover:underline"
                    >
                      View Project
                    </Link>
                  </div>
                </div>
              ))}

              {projects?.length === 0 && (
                <div className="col-span-full text-center py-12">
                  <p className="text-gray-500">No projects found.</p>
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
                  className={`px-4 py-2 rounded-md ${
                    currentPage === 1
                      ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                      : 'bg-gray-200 hover:bg-gray-300'
                  }`}
                >
                  Previous
                </button>

                {Array.from({ length: pagination.pages }, (_, i) => i + 1).map(
                  (page) => (
                    <button
                      key={page}
                      onClick={() => handlePageChange(page)}
                      className={`px-4 py-2 rounded-md ${
                        currentPage === page
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-200 hover:bg-gray-300'
                      }`}
                    >
                      {page}
                    </button>
                  )
                )}

                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === pagination.pages}
                  className={`px-4 py-2 rounded-md ${
                    currentPage === pagination.pages
                      ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                      : 'bg-gray-200 hover:bg-gray-300'
                  }`}
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
