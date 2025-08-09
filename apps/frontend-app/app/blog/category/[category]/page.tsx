/**
 * Pagina categoria blog TrovaMi
 * Utilizzata da: visitatori per navigare articoli per categoria
 * Gestita da: sistema di routing dinamico Next.js
 */

import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getPostsByCategory, getAllCategories } from '@/lib/blog-data'
import { BlogPost } from '@/lib/types/blog'
import { Clock, User, ArrowLeft, TrendingUp } from 'lucide-react'

interface CategoryPageProps {
  params: {
    category: string
  }
}

const categoryMap: Record<string, string> = {
  'lead-generation': 'Lead Generation',
  'business-online': 'Business Online', 
  'freelancing': 'Freelancing',
  'seo-web': 'SEO & Web'
}

const categoryDescriptions: Record<string, string> = {
  'Lead Generation': 'Strategie e tecniche per trovare clienti online, acquisire nuovi prospect e far crescere il tuo business.',
  'Business Online': 'Guide per creare e far crescere un business digitale redditizio, dal freelancing alle startup.',
  'Freelancing': 'Consigli per freelancer e agenzie su come gestire clienti, prezzi e crescere professionalmente.',
  'SEO & Web': 'Tutorial e guide per ottimizzare siti web, migliorare la SEO e aumentare la visibilità online.'
}

export async function generateMetadata({ params }: CategoryPageProps): Promise<Metadata> {
  const categorySlug = params.category
  const categoryName = categoryMap[categorySlug]
  
  if (!categoryName) {
    return {
      title: 'Categoria non trovata | TrovaMi Blog'
    }
  }

  const posts = getPostsByCategory(categoryName)
  const description = categoryDescriptions[categoryName]

  return {
    title: `${categoryName} | Guide e Strategie | TrovaMi Blog`,
    description: `${description} ${posts.length} articoli disponibili.`,
    openGraph: {
      title: `${categoryName} | TrovaMi Blog`,
      description: description,
      type: 'website',
      url: `https://trovami.pro/blog/category/${categorySlug}`
    },
    alternates: {
      canonical: `https://trovami.pro/blog/category/${categorySlug}`
    }
  }
}

export function generateStaticParams() {
  return Object.keys(categoryMap).map((category) => ({
    category
  }))
}

export default function CategoryPage({ params }: CategoryPageProps) {
  const categorySlug = params.category
  const categoryName = categoryMap[categorySlug]
  
  if (!categoryName) {
    notFound()
  }

  const posts = getPostsByCategory(categoryName)
  const description = categoryDescriptions[categoryName]

  return (
    <div className="min-h-screen bg-white">
      {/* Breadcrumb */}
      <div className="bg-gray-50 border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <nav className="flex items-center space-x-2 text-sm">
            <Link href="/" className="text-gray-500 hover:text-gray-700">Home</Link>
            <span className="text-gray-400">/</span>
            <Link href="/blog" className="text-gray-500 hover:text-gray-700">Blog</Link>
            <span className="text-gray-400">/</span>
            <span className="text-gray-900 font-medium">{categoryName}</span>
          </nav>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="mb-4">
            <Link 
              href="/blog"
              className="inline-flex items-center text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              Torna al blog
            </Link>
          </div>
          
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            {categoryName}
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-8">
            {description}
          </p>
          
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6 max-w-2xl mx-auto">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Metti in Pratica Quello che Impari
            </h3>
            <p className="text-gray-600 mb-4 text-sm">
              TrovaMi ti aiuta a trovare clienti reali per applicare subito queste strategie.
            </p>
            <Link 
              href="/register"
              className="inline-flex items-center px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors duration-200 font-medium text-sm"
            >
              Prova Gratis
              <TrendingUp className="ml-2 h-4 w-4" />
            </Link>
          </div>
        </div>

        {/* Articles Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {posts.map((post: BlogPost) => (
            <Link key={post.slug} href={`/blog/${post.slug}`} className="group">
              <article className="bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow duration-200 overflow-hidden">
                <div className="aspect-video bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                  <span className="text-3xl">{post.emoji}</span>
                </div>
                <div className="p-6">
                  <div className="flex items-center space-x-4 text-sm text-gray-500 mb-3">
                    {post.featured && (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                        In evidenza
                      </span>
                    )}
                    <div className="flex items-center">
                      <Clock className="h-4 w-4 mr-1" />
                      <span>{post.readTime}</span>
                    </div>
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 group-hover:text-blue-600 transition-colors duration-200 mb-2">
                    {post.title}
                  </h3>
                  <p className="text-gray-600 line-clamp-3 mb-4">
                    {post.excerpt}
                  </p>
                  <div className="flex items-center text-sm text-gray-500">
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

        {/* Empty State */}
        {posts.length === 0 && (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">📝</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              Nessun articolo trovato
            </h3>
            <p className="text-gray-600 mb-6">
              Non ci sono ancora articoli in questa categoria.
            </p>
            <Link 
              href="/blog"
              className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors duration-200 font-medium"
            >
              Vedi tutti gli articoli
            </Link>
          </div>
        )}

        {/* Bottom CTA */}
        <div className="mt-16 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-lg p-8 text-center text-white">
          <h3 className="text-2xl font-bold mb-4">
            Pronto a Passare dalla Teoria alla Pratica?
          </h3>
          <p className="text-blue-100 mb-6 max-w-2xl mx-auto">
            Con TrovaMi puoi applicare subito quello che hai imparato. 
            Trova lead qualificati e inizia a contattare i tuoi primi clienti potenziali.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link 
              href="/register"
              className="inline-flex items-center px-8 py-3 bg-white text-blue-600 rounded-md hover:bg-gray-50 transition-colors duration-200 font-semibold"
            >
              Inizia Gratis - 2 Lead Inclusi
            </Link>
            <Link 
              href="/tools/public-scan"
              className="inline-flex items-center px-8 py-3 border border-white text-white rounded-md hover:bg-white hover:text-blue-600 transition-colors duration-200 font-medium"
            >
              Prova l'Analisi Gratuita
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
