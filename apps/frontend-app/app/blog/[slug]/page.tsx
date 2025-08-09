/**
 * Pagina singolo articolo del blog TrovaMi
 * Utilizzata da: visitatori per leggere articoli completi
 * Gestita da: sistema di routing dinamico Next.js
 */

import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import ReactMarkdown from 'react-markdown'
import { getPostBySlug, getRecentPosts } from '@/lib/blog-data'
import { getPostContent } from '@/lib/content'
import { BlogPost } from '@/lib/types/blog'
import { Calendar, Clock, User, Tag, ArrowLeft, TrendingUp } from 'lucide-react'

interface BlogPostPageProps {
  params: {
    slug: string
  }
}

export async function generateMetadata({ params }: BlogPostPageProps): Promise<Metadata> {
  const post = getPostBySlug(params.slug)
  
  if (!post) {
    return {
      title: 'Articolo non trovato | TrovaMi Blog'
    }
  }

  return {
    title: post.seoTitle || post.title,
    description: post.seoDescription || post.excerpt,
    keywords: post.keywords,
    openGraph: {
      title: post.title,
      description: post.excerpt,
      type: 'article',
      publishedTime: post.date,
      authors: [post.author],
      tags: post.tags,
      url: `https://trovami.pro/blog/${post.slug}`
    },
    twitter: {
      card: 'summary_large_image',
      title: post.title,
      description: post.excerpt
    },
    alternates: {
      canonical: `https://trovami.pro/blog/${post.slug}`
    }
  }
}

export default function BlogPostPage({ params }: BlogPostPageProps) {
  const post = getPostBySlug(params.slug)
  
  if (!post) {
    notFound()
  }

  const content = getPostContent(post.slug)
  const relatedPosts = getRecentPosts(4).filter((p: BlogPost) => p.slug !== post.slug).slice(0, 3)

  return (
    <div className="min-h-screen bg-white">
      {/* Breadcrumb */}
      <div className="bg-gray-50 border-b">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <nav className="flex items-center space-x-2 text-sm">
            <Link href="/" className="text-gray-500 hover:text-gray-700">Home</Link>
            <span className="text-gray-400">/</span>
            <Link href="/blog" className="text-gray-500 hover:text-gray-700">Blog</Link>
            <span className="text-gray-400">/</span>
            <span className="text-gray-900 font-medium">{post.category}</span>
          </nav>
        </div>
      </div>

      <article className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <header className="mb-8">
          <div className="mb-4">
            <Link 
              href="/blog"
              className="inline-flex items-center text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              Torna al blog
            </Link>
          </div>
          
          <div className="mb-6">
            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800 mb-4">
              {post.category}
            </span>
            <h1 className="text-4xl font-bold text-gray-900 leading-tight mb-4">
              {post.title}
            </h1>
            <p className="text-xl text-gray-600 leading-relaxed">
              {post.excerpt}
            </p>
          </div>

          <div className="flex items-center justify-between flex-wrap gap-4 pb-6 border-b border-gray-200">
            <div className="flex items-center space-x-6 text-sm text-gray-500">
              <div className="flex items-center">
                <User className="h-4 w-4 mr-2" />
                <span>{post.author}</span>
              </div>
              <div className="flex items-center">
                <Calendar className="h-4 w-4 mr-2" />
                <span>{post.date}</span>
              </div>
              <div className="flex items-center">
                <Clock className="h-4 w-4 mr-2" />
                <span>{post.readTime}</span>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              {post.tags.slice(0, 3).map((tag: string) => (
                <span 
                  key={tag}
                  className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-gray-100 text-gray-700"
                >
                  <Tag className="h-3 w-3 mr-1" />
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </header>

        {/* Hero Visual */}
        <div className="mb-8">
          <div className="aspect-video bg-gradient-to-br from-blue-100 to-indigo-200 rounded-lg flex items-center justify-center">
            <span className="text-6xl">{post.emoji}</span>
          </div>
        </div>

        {/* CTA Above Content */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6 mb-8">
          <div className="text-center">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Pronto a Trovare i Tuoi Primi Clienti?
            </h3>
            <p className="text-gray-600 mb-4">
              TrovaMi analizza automaticamente siti web e trova lead qualificati per la tua attività.
            </p>
            <Link 
              href="/register"
              className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors duration-200 font-medium"
            >
              Inizia Gratis - 2 Lead Inclusi
              <TrendingUp className="ml-2 h-4 w-4" />
            </Link>
          </div>
        </div>

        {/* Content */}
        <div className="prose prose-lg max-w-none mb-12 markdown-content">
          <ReactMarkdown 
            components={{
              h1: ({children}) => <h1 className="text-3xl font-bold text-gray-900 mb-6 mt-8">{children}</h1>,
              h2: ({children}) => <h2 className="text-2xl font-semibold text-gray-900 mb-4 mt-8">{children}</h2>,
              h3: ({children}) => <h3 className="text-xl font-semibold text-gray-900 mb-3 mt-6">{children}</h3>,
              p: ({children}) => <p className="text-gray-700 mb-4 leading-relaxed">{children}</p>,
              ul: ({children}) => <ul className="list-disc pl-6 mb-4 space-y-1">{children}</ul>,
              ol: ({children}) => <ol className="list-decimal pl-6 mb-4 space-y-1">{children}</ol>,
              li: ({children}) => <li className="text-gray-700">{children}</li>,
              blockquote: ({children}) => (
                <blockquote className="border-l-4 border-blue-500 pl-4 py-2 my-4 bg-blue-50 rounded-r-lg">
                  {children}
                </blockquote>
              ),
              code: ({children}) => (
                <code className="bg-gray-100 px-2 py-1 rounded text-sm font-mono text-gray-800">
                  {children}
                </code>
              ),
              pre: ({children}) => (
                <pre className="bg-gray-900 text-white p-4 rounded-lg overflow-x-auto my-4">
                  {children}
                </pre>
              ),
              a: ({href, children}) => (
                <Link 
                  href={href || '#'} 
                  className="text-blue-600 hover:text-blue-700 underline"
                >
                  {children}
                </Link>
              ),
              strong: ({children}) => <strong className="font-semibold text-gray-900">{children}</strong>
            }}
          >
            {content}
          </ReactMarkdown>
        </div>

        {/* FAQ Schema Placeholder */}
        <div className="bg-gray-50 rounded-lg p-6 mb-12">
          <h3 className="text-xl font-semibold text-gray-900 mb-4">
            Domande Frequenti
          </h3>
          <div className="space-y-4">
            <div className="bg-white rounded-lg p-4 shadow-sm">
              <h4 className="font-medium text-gray-900 mb-2">Come posso iniziare con TrovaMi?</h4>
              <p className="text-gray-600 text-sm">
                Registrati gratuitamente e ricevi 2 lead qualificati per testare il servizio. 
                Non serve carta di credito per iniziare.
              </p>
            </div>
            <div className="bg-white rounded-lg p-4 shadow-sm">
              <h4 className="font-medium text-gray-900 mb-2">Quanto costano i lead aggiuntivi?</h4>
              <p className="text-gray-600 text-sm">
                Offriamo piani flessibili a partire da €29/mese per 20 lead qualificati. 
                Vedi tutti i piani nella pagina prezzi.
              </p>
            </div>
            <div className="bg-white rounded-lg p-4 shadow-sm">
              <h4 className="font-medium text-gray-900 mb-2">I lead sono realmente qualificati?</h4>
              <p className="text-gray-600 text-sm">
                Sì, ogni lead viene analizzato tecnicamente per identificare problemi reali 
                che puoi risolvere con i tuoi servizi.
              </p>
            </div>
          </div>
        </div>

        {/* Bottom CTA */}
        <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-lg p-8 text-center text-white mb-12">
          <h3 className="text-2xl font-bold mb-4">
            Trasforma le Strategie in Risultati Concreti
          </h3>
          <p className="text-blue-100 mb-6 max-w-2xl mx-auto">
            Hai letto le strategie, ora è il momento di applicarle. TrovaMi ti fornisce lead 
            qualificati e pronti per essere contattati.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link 
              href="/register"
              className="inline-flex items-center px-8 py-3 bg-white text-blue-600 rounded-md hover:bg-gray-50 transition-colors duration-200 font-semibold"
            >
              Prova Gratis Ora
            </Link>
            <Link 
              href="/tools/public-scan"
              className="inline-flex items-center px-8 py-3 border border-white text-white rounded-md hover:bg-white hover:text-blue-600 transition-colors duration-200 font-medium"
            >
              Testa l'Analisi Gratuita
            </Link>
          </div>
        </div>
      </article>

      {/* Related Articles */}
      {relatedPosts.length > 0 && (
        <section className="bg-gray-50 py-12">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <h3 className="text-2xl font-bold text-gray-900 mb-8 text-center">
              Articoli Correlati
            </h3>
            <div className="grid md:grid-cols-3 gap-6">
              {relatedPosts.map((relatedPost: BlogPost) => (
                <Link key={relatedPost.slug} href={`/blog/${relatedPost.slug}`} className="group">
                  <article className="bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow duration-200 overflow-hidden">
                    <div className="aspect-video bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                      <span className="text-3xl">{relatedPost.emoji}</span>
                    </div>
                    <div className="p-4">
                      <span className="inline-block px-2 py-1 text-xs font-medium bg-gray-100 text-gray-800 rounded-full mb-2">
                        {relatedPost.category}
                      </span>
                      <h4 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors duration-200 mb-2 line-clamp-2">
                        {relatedPost.title}
                      </h4>
                      <p className="text-gray-600 text-sm line-clamp-2">
                        {relatedPost.excerpt}
                      </p>
                    </div>
                  </article>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  )
}
