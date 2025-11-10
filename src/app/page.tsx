'use client';

import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import Link from 'next/link';
import Image from 'next/image';
import { AppDispatch, RootState } from '@/redux/store';
import { fetchFeaturedProjects } from '@/redux/features/project/projectActions';
import { fetchFeaturedArticles } from '@/redux/features/article/articleActions';

export default function Home() {
  const dispatch = useDispatch<AppDispatch>();
  const { featuredProjects, loading: projectsLoading } = useSelector((state: RootState) => state.projects);
  const { featuredArticles, loading: articlesLoading } = useSelector((state: RootState) => state.articles);

  useEffect(() => {
    dispatch(fetchFeaturedProjects());
    dispatch(fetchFeaturedArticles());
  }, [dispatch]);

  return (
    <main className="min-h-screen p-4 md:p-8">
      {/* Hero Section */}
      <section className="py-16 md:py-24 text-center">
        <h1 className="text-4xl md:text-6xl font-bold mb-6">Foysal Ahmed Min</h1>
        <p className="text-xl md:text-2xl mb-8 max-w-3xl mx-auto">
          Full Stack Developer & Designer creating beautiful, functional web experiences
        </p>
        <div className="flex flex-wrap justify-center gap-4">
          <Link 
            href="/projects" 
            className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            View Projects
          </Link>
          <Link 
            href="/contact" 
            className="px-6 py-3 border border-blue-600 text-blue-600 rounded-md hover:bg-blue-50 transition-colors"
          >
            Contact Me
          </Link>
        </div>
      </section>

      {/* Featured Projects Section */}
      <section className="py-12 md:py-16">
        <div className="container mx-auto">
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-3xl font-bold">Featured Projects</h2>
            <Link 
              href="/projects" 
              className="text-blue-600 hover:underline"
            >
              View All
            </Link>
          </div>
          
          {projectsLoading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {featuredProjects?.map((project) => (
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
                    <h3 className="text-xl font-semibold mb-2">{project.name}</h3>
                    <p className="text-gray-600 mb-4 line-clamp-2">{project.description}</p>
                    <Link 
                      href={`/projects/${project.slug}`}
                      className="text-blue-600 hover:underline"
                    >
                      View Project
                    </Link>
                  </div>
                </div>
              ))}
              
              {featuredProjects?.length === 0 && (
                <div className="col-span-full text-center py-12">
                  <p className="text-gray-500">No featured projects available.</p>
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      {/* Featured Articles Section */}
      <section className="py-12 md:py-16 bg-gray-50">
        <div className="container mx-auto">
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-3xl font-bold">Featured Articles</h2>
            <Link 
              href="/articles" 
              className="text-blue-600 hover:underline"
            >
              View All
            </Link>
          </div>
          
          {articlesLoading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {featuredArticles?.map((article) => (
                <div
                  key={article._id.toString()}
                  className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow"
                >
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
                      {article.is_premium && (
                        <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded-full">
                          Premium
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              
              {featuredArticles?.length === 0 && (
                <div className="col-span-full text-center py-12">
                  <p className="text-gray-500">No featured articles available.</p>
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      {/* About Section */}
      <section className="py-12 md:py-16">
        <div className="container mx-auto">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-3xl font-bold mb-6">About Me</h2>
            <p className="text-lg mb-8">
              I'm a passionate full-stack developer with expertise in React, Next.js, Node.js, and MongoDB.
              With over 5 years of experience, I specialize in creating responsive, user-friendly web applications
              that deliver exceptional user experiences.
            </p>
            <Link 
              href="/about" 
              className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors inline-block"
            >
              Learn More
            </Link>
          </div>
        </div>
      </section>

      {/* Contact CTA Section */}
      <section className="py-12 md:py-16 bg-blue-600 text-white">
        <div className="container mx-auto text-center">
          <h2 className="text-3xl font-bold mb-4">Let's Work Together</h2>
          <p className="text-xl mb-8 max-w-2xl mx-auto">
            Have a project in mind? Let's discuss how I can help bring your ideas to life.
          </p>
          <Link 
            href="/contact" 
            className="px-6 py-3 bg-white text-blue-600 rounded-md hover:bg-gray-100 transition-colors inline-block"
          >
            Get In Touch
          </Link>
        </div>
      </section>
    </main>
  );
}