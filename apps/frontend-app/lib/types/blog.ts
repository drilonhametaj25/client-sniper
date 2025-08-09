/**
 * Tipi TypeScript per il sistema blog di TrovaMi
 * Utilizzato da: componenti blog, pagine articoli, sitemap
 * Gestito da: sistema di gestione contenuti statico
 */

export interface BlogPost {
  slug: string
  title: string
  excerpt: string
  content: string
  author: string
  date: string
  readTime: string
  category: string
  tags: string[]
  featured: boolean
  emoji: string
  seoTitle?: string
  seoDescription?: string
  keywords: string[]
  published: boolean
  lastModified?: string
}

export interface BlogCategory {
  name: string
  slug: string
  description: string
  postCount: number
}

export interface BlogTag {
  name: string
  slug: string
  postCount: number
}

export interface BlogMeta {
  totalPosts: number
  categories: BlogCategory[]
  tags: BlogTag[]
  lastUpdate: string
}
