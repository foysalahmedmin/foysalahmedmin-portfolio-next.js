'use client';

import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import Image from 'next/image';
import Link from 'next/link';
import { AppDispatch, RootState } from '@/redux/store';
import { fetchProjectBySlug } from '@/redux/features/project/projectActions';

export default function ProjectDetailPage({ params }: { params: { slug: string } }) {
  const { slug } = params;
  const dispatch = useDispatch<AppDispatch>();
  const { project, loading, error } = useSelector((state: RootState) => state.projects);

  useEffect(() => {
    if (slug) {
      dispatch(fetchProjectBySlug(slug));
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
            href="/projects" 
            className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Back to Projects
          </Link>
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen p-4 md:p-8">
        <div className="container mx-auto text-center py-16">
          <h1 className="text-3xl font-bold mb-4">Project Not Found</h1>
          <p className="mb-8">The project you're looking for doesn't exist or has been removed.</p>
          <Link 
            href="/projects" 
            className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Back to Projects
          </Link>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen p-4 md:p-8">
      <div className="container mx-auto">
        {/* Breadcrumb */}
        <div className="flex items-center text-sm mb-6">
          <Link href="/" className="text-gray-500 hover:text-blue-600">Home</Link>
          <span className="mx-2">/</span>
          <Link href="/projects" className="text-gray-500 hover:text-blue-600">Projects</Link>
          <span className="mx-2">/</span>
          <span className="text-gray-900">{project.name}</span>
        </div>

        {/* Project Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-4">{project.name}</h1>
          {project.category && (
            <div className="mb-4">
              <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm">
                {project.category.name}
              </span>
            </div>
          )}
          <p className="text-xl text-gray-600">{project.description}</p>
        </div>

        {/* Project Thumbnail */}
        {project.thumbnail && (
          <div className="relative w-full h-96 mb-8 rounded-lg overflow-hidden">
            <Image 
              src={project.thumbnail} 
              alt={project.name}
              fill
              className="object-cover"
            />
          </div>
        )}

        {/* Project Content */}
        <div className="prose max-w-none mb-12" dangerouslySetInnerHTML={{ __html: project.content }} />

        {/* Project Images Gallery */}
        {project.images && project.images.length > 0 && (
          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-6">Project Gallery</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {project.images.map((image, index) => (
                <div key={index} className="relative h-64 rounded-lg overflow-hidden">
                  <Image 
                    src={image} 
                    alt={`${project.name} - Image ${index + 1}`}
                    fill
                    className="object-cover"
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Project Links */}
        {(project.demo_url || project.github_url) && (
          <div className="flex flex-wrap gap-4 mb-12">
            {project.demo_url && (
              <a 
                href={project.demo_url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                View Live Demo
              </a>
            )}
            {project.github_url && (
              <a 
                href={project.github_url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="px-6 py-3 border border-blue-600 text-blue-600 rounded-md hover:bg-blue-50 transition-colors"
              >
                View Source Code
              </a>
            )}
          </div>
        )}

        {/* Tags */}
        {project.tags && project.tags.length > 0 && (
          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-4">Technologies Used</h2>
            <div className="flex flex-wrap gap-2">
              {project.tags.map((tag, index) => (
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

        {/* Back to Projects */}
        <div className="mt-8">
          <Link 
            href="/projects" 
            className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Back to Projects
          </Link>
        </div>
      </div>
    </main>
  );
}