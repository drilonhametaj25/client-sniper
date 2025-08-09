// Sitemap automatica per l'indicizzazione Google del portale TrovaMi
// Utilizzata da: motori di ricerca per scoprire le pagine del sito
// Gestita da: Next.js (generazione automatica)

import { MetadataRoute } from 'next'
import { blogPosts, getAllCategories } from '@/lib/blog-data'

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://trovami.pro'
  
  // Static pages
  const staticPages = [
    // Pagine principali
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'daily' as const,
      priority: 1,
    },
    {
      url: `${baseUrl}/register`,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.9,
    },
    {
      url: `${baseUrl}/login`,
      lastModified: new Date(),
      changeFrequency: 'monthly' as const,
      priority: 0.5,
    },
    
    // Blog main page
    {
      url: `${baseUrl}/blog`,
      lastModified: new Date(),
      changeFrequency: 'daily' as const,
      priority: 0.9,
    },
    
    // Pagine SEO esistenti
    {
      url: `${baseUrl}/come-trovare-clienti`,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.9,
    },
    {
      url: `${baseUrl}/lead-generation-agenzie`,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.9,
    },
    {
      url: `${baseUrl}/confronto-costi-lead`,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.9,
    },
    
    // Tool pages
    {
      url: `${baseUrl}/tools/public-scan`,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.9,
    },
    
    // Pagine legali
    {
      url: `${baseUrl}/privacy`,
      lastModified: new Date(),
      changeFrequency: 'monthly' as const,
      priority: 0.3,
    },
    {
      url: `${baseUrl}/terms`,
      lastModified: new Date(),
      changeFrequency: 'monthly' as const,
      priority: 0.3,
    },
    {
      url: `${baseUrl}/contact`,
      lastModified: new Date(),
      changeFrequency: 'monthly' as const,
      priority: 0.6,
    },
    {
      url: `${baseUrl}/help`,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.6,
    },
  ]

  // Blog posts
  const blogPostPages = blogPosts
    .filter(post => post.published)
    .map(post => ({
      url: `${baseUrl}/blog/${post.slug}`,
      lastModified: new Date(post.lastModified || post.date),
      changeFrequency: 'weekly' as const,
      priority: post.featured ? 0.8 : 0.7,
    }))

  // Blog categories
  const categoryPages = getAllCategories().map(category => ({
    url: `${baseUrl}/blog/category/${category.toLowerCase().replace(/\s+/g, '-')}`,
    lastModified: new Date(),
    changeFrequency: 'weekly' as const,
    priority: 0.6,
  }))

  return [...staticPages, ...blogPostPages, ...categoryPages]
}
