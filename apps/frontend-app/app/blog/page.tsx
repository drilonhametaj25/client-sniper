/**
 * Pagina principale del blog SEO di TrovaMi
 * Utilizzata da: visitatori per navigare gli articoli del blog
 * Gestita da: sistema di blog statico con generazione automatica
 */

import { Metadata } from 'next'
import Link from 'next/link'
import { blogPosts, getAllCategories } from '@/lib/blog-data'
import { BlogPost } from '@/lib/types/blog'
import { Clock, User, Tag, TrendingUp } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Blog Lead Generation | Guide Gratuite per Trovare Clienti Online',
  description: 'Scopri come trovare clienti online, guadagnare con il digitale e far crescere il tuo business. Guide gratuite, strategie testate e tool per la lead generation.',
  keywords: [
    'come trovare clienti online',
    'lead generation',
    'come guadagnare online', 
    'business online',
    'acquisizione clienti',
    'marketing digitale',
    'freelancer',
    'agenzia web'
  ],
  openGraph: {
    title: 'Blog Lead Generation | Guide Gratuite TrovaMi',
    description: 'Le migliori strategie per trovare clienti online e far crescere il tuo business digitale.',
    type: 'website',
    url: 'https://trovami.pro/blog'
  }
}

export default function BlogPage() {
  const featuredPosts = blogPosts.filter((post: BlogPost) => post.featured).slice(0, 3)
  const recentPosts = blogPosts.filter((post: BlogPost) => !post.featured).slice(0, 9)
  const categories = getAllCategories()

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <div className="bg-gradient-to-br from-blue-50 to-indigo-100 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl font-bold text-gray-900 sm:text-5xl lg:text-6xl">
              Guida alla <span className="text-blue-600">Lead Generation</span>
            </h1>
            <p className="mt-6 text-xl text-gray-600 max-w-3xl mx-auto">
              Scopri come trovare clienti online, guadagnare con il digitale e far crescere il tuo business. 
              Guide pratiche, strategie testate e tool gratuiti.
            </p>
            <div className="mt-8">
              <Link 
                href="/register" 
                className="inline-flex items-center px-8 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 transition-colors duration-200"
              >
                Prova TrovaMi Gratis
                <TrendingUp className="ml-2 h-5 w-5" />
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Featured Posts */}
        <section className="mb-16">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-3xl font-bold text-gray-900">Articoli in Evidenza</h2>
            <div className="flex items-center space-x-2 text-sm text-gray-500">
              <TrendingUp className="h-4 w-4" />
              <span>I più letti</span>
            </div>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            {featuredPosts.map((post) => (
              <Link key={post.slug} href={`/blog/${post.slug}`} className="group">
                <article className="bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow duration-200 overflow-hidden">
                  <div className="aspect-video bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center">
                    <span className="text-4xl">{post.emoji}</span>
                  </div>
                  <div className="p-6">
                    <div className="flex items-center space-x-4 text-sm text-gray-500 mb-3">
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {post.category}
                      </span>
                      <div className="flex items-center">
                        <Clock className="h-4 w-4 mr-1" />
                        <span>{post.readTime}</span>
                      </div>
                    </div>
                    <h3 className="text-xl font-semibold text-gray-900 group-hover:text-blue-600 transition-colors duration-200 mb-2">
                      {post.title}
                    </h3>
                    <p className="text-gray-600 line-clamp-3">
                      {post.excerpt}
                    </p>
                    <div className="mt-4 flex items-center text-sm text-gray-500">
                      <User className="h-4 w-4 mr-1" />
                      <span>{post.author}</span>
                      <span className="mx-2">•</span>
                      <span>{post.date}</span>
                    </div>
                  </div>
                </article>
              </Link>
            ))}
          </div>
        </section>

        <div className="grid lg:grid-cols-4 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-3">
            <h2 className="text-2xl font-bold text-gray-900 mb-8">Tutti gli Articoli</h2>
            
            <div className="grid md:grid-cols-2 gap-6">
              {recentPosts.map((post) => (
                <Link key={post.slug} href={`/blog/${post.slug}`} className="group">
                  <article className="bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow duration-200 overflow-hidden">
                    <div className="aspect-video bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                      <span className="text-3xl">{post.emoji}</span>
                    </div>
                    <div className="p-5">
                      <div className="flex items-center space-x-3 text-sm text-gray-500 mb-2">
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                          {post.category}
                        </span>
                        <div className="flex items-center">
                          <Clock className="h-3 w-3 mr-1" />
                          <span>{post.readTime}</span>
                        </div>
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900 group-hover:text-blue-600 transition-colors duration-200 mb-2">
                        {post.title}
                      </h3>
                      <p className="text-gray-600 text-sm line-clamp-2 mb-3">
                        {post.excerpt}
                      </p>
                      <div className="flex items-center text-xs text-gray-500">
                        <span>{post.author}</span>
                        <span className="mx-1">•</span>
                        <span>{post.date}</span>
                      </div>
                    </div>
                  </article>
                </Link>
              ))}
            </div>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            {/* CTA Box */}
            <div className="bg-gradient-to-br from-blue-50 to-indigo-100 rounded-lg p-6 mb-8">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">
                Inizia la Tua Lead Generation
              </h3>
              <p className="text-gray-600 text-sm mb-4">
                Trova i tuoi primi clienti con TrovaMi. Analisi automatica e lead qualificati.
              </p>
              <Link 
                href="/register" 
                className="block w-full text-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors duration-200 text-sm font-medium"
              >
                Prova Gratis
              </Link>
            </div>

            {/* Categories */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Categorie</h3>
              <div className="space-y-2">
                {categories.map((category: string) => (
                  <Link 
                    key={category}
                    href={`/blog/category/${category.toLowerCase().replace(/\s+/g, '-')}`}
                    className="flex items-center justify-between p-2 hover:bg-gray-50 rounded-md transition-colors duration-200"
                  >
                    <span className="text-gray-700">{category}</span>
                    <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                      {blogPosts.filter((post: BlogPost) => post.category === category).length}
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
