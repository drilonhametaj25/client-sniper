/**
 * Content Quality Analyzer per Client Sniper
 * Analizza la qualità e freschezza dei contenuti di un sito web
 */

import { Page } from 'playwright'
import axios from 'axios'

export interface BlogAnalysis {
  exists: boolean
  url: string | null
  lastUpdate: Date | null
  daysSinceUpdate: number | null
  postCount: number
  estimatedAvgPostLength: number
  updateFrequency: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly' | 'dormant' | 'unknown'
  recentPosts: BlogPostPreview[]
}

export interface BlogPostPreview {
  title: string
  date: Date | null
  url: string
}

export interface ContentDepthAnalysis {
  avgPageWordCount: number
  hasLongFormContent: boolean      // >1500 words
  hasCaseStudies: boolean
  hasWhitepapers: boolean
  hasTestimonials: boolean
  hasPortfolio: boolean
  hasFAQ: boolean
  hasVideos: boolean
  contentTypes: string[]
}

export interface FreshnessAnalysis {
  copyrightYear: number | null
  isCopyrightCurrent: boolean
  hasRecentDates: boolean
  mostRecentDate: Date | null
  lastModifiedHeader: Date | null
  estimatedAge: 'fresh' | 'recent' | 'aging' | 'stale' | 'unknown'
}

export interface ContentQualityAnalysis {
  url: string
  analyzedAt: Date
  blog: BlogAnalysis
  depth: ContentDepthAnalysis
  freshness: FreshnessAnalysis
  contentScore: number  // 0-100
  recommendations: ContentRecommendation[]
}

export interface ContentRecommendation {
  type: 'critical' | 'high' | 'medium' | 'low'
  title: string
  description: string
  impact: string
}

// Blog paths to check
const BLOG_PATHS = [
  '/blog',
  '/news',
  '/articoli',
  '/magazine',
  '/insights',
  '/notizie',
  '/novita',
  '/journal',
  '/posts',
  '/updates'
]

// Content type indicators
const CONTENT_TYPE_PATTERNS = {
  caseStudies: [
    /case.?stud/i, /casi.?studi/i, /success.?stor/i,
    /cliente.*risultat/i, /portfolio.*progett/i
  ],
  whitepapers: [
    /whitepaper/i, /white.?paper/i, /e-?book/i, /guida.?gratuita/i,
    /download.*pdf/i, /risors.*gratuit/i
  ],
  testimonials: [
    /testimonian/i, /recension/i, /review/i, /opinioni/i,
    /cosa.*dicono/i, /client.*soddisfatt/i
  ],
  portfolio: [
    /portfolio/i, /lavori/i, /progetti/i, /works/i,
    /realizzazion/i, /gallery/i
  ],
  faq: [
    /faq/i, /domande.*frequent/i, /frequently.*asked/i,
    /rispost.*domand/i, /q\s*&\s*a/i
  ]
}

export class ContentQualityAnalyzer {
  /**
   * Analizza la qualità dei contenuti dal DOM della pagina
   */
  async analyzeContentQuality(
    page: Page,
    baseUrl: string,
    html: string
  ): Promise<ContentQualityAnalysis> {
    const blog = await this.analyzeBlog(page, baseUrl)
    const depth = await this.analyzeContentDepth(page, html)
    const freshness = this.analyzeFreshness(html)

    const contentScore = this.calculateContentScore(blog, depth, freshness)
    const recommendations = this.generateRecommendations(blog, depth, freshness)

    return {
      url: baseUrl,
      analyzedAt: new Date(),
      blog,
      depth,
      freshness,
      contentScore,
      recommendations
    }
  }

  /**
   * Analizza presenza e stato del blog
   */
  private async analyzeBlog(page: Page, baseUrl: string): Promise<BlogAnalysis> {
    let blogUrl: string | null = null
    let exists = false
    const recentPosts: BlogPostPreview[] = []
    let postCount = 0
    let avgPostLength = 0

    // 1. Search for blog link in navigation
    try {
      blogUrl = await page.evaluate((paths) => {
        const links = Array.from(document.querySelectorAll('a'))
        for (const link of links) {
          const href = link.getAttribute('href')?.toLowerCase() || ''
          const text = link.textContent?.toLowerCase() || ''

          for (const path of paths) {
            if (href.includes(path) || href.endsWith(path)) {
              return link.getAttribute('href')
            }
          }

          if (text.includes('blog') || text.includes('news') || text.includes('articoli')) {
            return link.getAttribute('href')
          }
        }
        return null
      }, BLOG_PATHS)

      if (blogUrl) {
        blogUrl = new URL(blogUrl, baseUrl).toString()
      }
    } catch {
      // Ignore navigation errors
    }

    // 2. Try common blog paths if no link found
    if (!blogUrl) {
      for (const path of BLOG_PATHS.slice(0, 3)) {
        try {
          const testUrl = new URL(path, baseUrl).toString()
          const response = await axios.head(testUrl, {
            timeout: 5000,
            validateStatus: () => true
          })
          if (response.status === 200) {
            blogUrl = testUrl
            break
          }
        } catch {
          // Path doesn't exist
        }
      }
    }

    // 3. If blog found, analyze it
    if (blogUrl) {
      try {
        await page.goto(blogUrl, { waitUntil: 'domcontentloaded', timeout: 10000 })
        exists = true

        // Extract blog posts info
        const blogData = await page.evaluate(() => {
          const posts: { title: string; date: string | null; url: string }[] = []

          // Common blog post selectors
          const articleSelectors = [
            'article',
            '.post',
            '.blog-post',
            '.entry',
            '.article',
            '[itemtype*="BlogPosting"]',
            '.blog-item',
            '.news-item'
          ]

          for (const selector of articleSelectors) {
            const articles = document.querySelectorAll(selector)
            if (articles.length > 0) {
              articles.forEach((article, index) => {
                if (index >= 10) return // Limit to 10 posts

                const titleEl = article.querySelector('h1, h2, h3, .title, .entry-title')
                const linkEl = article.querySelector('a')
                const dateEl = article.querySelector('time, .date, .post-date, [datetime]')

                posts.push({
                  title: titleEl?.textContent?.trim() || '',
                  date: dateEl?.getAttribute('datetime') || dateEl?.textContent?.trim() || null,
                  url: linkEl?.getAttribute('href') || ''
                })
              })
              break
            }
          }

          return {
            posts,
            postCount: document.querySelectorAll(articleSelectors.join(', ')).length
          }
        })

        postCount = blogData.postCount

        // Parse dates and create previews
        for (const post of blogData.posts) {
          let parsedDate: Date | null = null
          if (post.date) {
            parsedDate = this.parseDate(post.date)
          }
          recentPosts.push({
            title: post.title,
            date: parsedDate,
            url: post.url ? new URL(post.url, blogUrl).toString() : ''
          })
        }

      } catch {
        // Blog page couldn't be loaded
      }
    }

    // Determine update frequency
    const lastUpdate = recentPosts[0]?.date || null
    const daysSinceUpdate = lastUpdate
      ? Math.floor((Date.now() - lastUpdate.getTime()) / (1000 * 60 * 60 * 24))
      : null

    const updateFrequency = this.determineUpdateFrequency(daysSinceUpdate, recentPosts)

    return {
      exists,
      url: blogUrl,
      lastUpdate,
      daysSinceUpdate,
      postCount,
      estimatedAvgPostLength: avgPostLength,
      updateFrequency,
      recentPosts: recentPosts.slice(0, 5)
    }
  }

  /**
   * Parse date string to Date object
   */
  private parseDate(dateStr: string): Date | null {
    try {
      // Try ISO format first
      const isoDate = new Date(dateStr)
      if (!isNaN(isoDate.getTime())) return isoDate

      // Try common Italian date formats
      const italianPatterns = [
        /(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})/,  // DD/MM/YYYY
        /(\d{4})[\/\-.](\d{1,2})[\/\-.](\d{1,2})/,  // YYYY/MM/DD
        /(\d{1,2})\s+(\w+)\s+(\d{4})/               // DD Month YYYY
      ]

      for (const pattern of italianPatterns) {
        const match = dateStr.match(pattern)
        if (match) {
          // Handle Italian months
          const italianMonths: Record<string, number> = {
            'gennaio': 0, 'febbraio': 1, 'marzo': 2, 'aprile': 3,
            'maggio': 4, 'giugno': 5, 'luglio': 6, 'agosto': 7,
            'settembre': 8, 'ottobre': 9, 'novembre': 10, 'dicembre': 11
          }

          if (match[2] && isNaN(parseInt(match[2]))) {
            const month = italianMonths[match[2].toLowerCase()]
            if (month !== undefined) {
              return new Date(parseInt(match[3]), month, parseInt(match[1]))
            }
          }

          // Numeric date
          const year = match[1].length === 4 ? parseInt(match[1]) : parseInt(match[3])
          const month = match[1].length === 4 ? parseInt(match[2]) - 1 : parseInt(match[2]) - 1
          const day = match[1].length === 4 ? parseInt(match[3]) : parseInt(match[1])
          return new Date(year, month, day)
        }
      }

      return null
    } catch {
      return null
    }
  }

  /**
   * Determine blog update frequency
   */
  private determineUpdateFrequency(
    daysSinceUpdate: number | null,
    posts: BlogPostPreview[]
  ): BlogAnalysis['updateFrequency'] {
    if (daysSinceUpdate === null) return 'unknown'

    if (daysSinceUpdate <= 7) return 'daily'
    if (daysSinceUpdate <= 30) return 'weekly'
    if (daysSinceUpdate <= 90) return 'monthly'
    if (daysSinceUpdate <= 180) return 'quarterly'
    if (daysSinceUpdate <= 365) return 'yearly'
    return 'dormant'
  }

  /**
   * Analizza profondità dei contenuti
   */
  private async analyzeContentDepth(page: Page, html: string): Promise<ContentDepthAnalysis> {
    // Get word count
    const pageText = await page.evaluate(() => document.body?.innerText || '')
    const wordCount = pageText.split(/\s+/).filter(w => w.length > 0).length

    // Check for content types
    const contentTypes: string[] = []
    const checks = {
      hasCaseStudies: false,
      hasWhitepapers: false,
      hasTestimonials: false,
      hasPortfolio: false,
      hasFAQ: false,
      hasVideos: false
    }

    // Check HTML for content patterns
    const lowerHtml = html.toLowerCase()

    for (const [type, patterns] of Object.entries(CONTENT_TYPE_PATTERNS)) {
      const key = `has${type.charAt(0).toUpperCase()}${type.slice(1)}` as keyof typeof checks
      for (const pattern of patterns) {
        if (pattern.test(lowerHtml)) {
          checks[key] = true
          contentTypes.push(type)
          break
        }
      }
    }

    // Check for videos
    if (lowerHtml.includes('youtube.com') ||
        lowerHtml.includes('vimeo.com') ||
        lowerHtml.includes('<video') ||
        lowerHtml.includes('wistia.com')) {
      checks.hasVideos = true
      contentTypes.push('videos')
    }

    return {
      avgPageWordCount: wordCount,
      hasLongFormContent: wordCount > 1500,
      hasCaseStudies: checks.hasCaseStudies,
      hasWhitepapers: checks.hasWhitepapers,
      hasTestimonials: checks.hasTestimonials,
      hasPortfolio: checks.hasPortfolio,
      hasFAQ: checks.hasFAQ,
      hasVideos: checks.hasVideos,
      contentTypes: [...new Set(contentTypes)]
    }
  }

  /**
   * Analizza freschezza dei contenuti
   */
  private analyzeFreshness(html: string): FreshnessAnalysis {
    const currentYear = new Date().getFullYear()

    // Check copyright year
    let copyrightYear: number | null = null
    const copyrightMatch = html.match(/(?:©|copyright|&copy;)\s*(\d{4})/i)
    if (copyrightMatch) {
      copyrightYear = parseInt(copyrightMatch[1])
    }

    // Find dates in the page
    const datePatterns = [
      /(\d{4})-(\d{2})-(\d{2})/g,           // ISO format
      /(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/g,  // DD/MM/YYYY
      /(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/g   // YYYY/MM/DD
    ]

    const dates: Date[] = []
    for (const pattern of datePatterns) {
      let match
      while ((match = pattern.exec(html)) !== null) {
        const date = this.parseDate(match[0])
        if (date && date.getFullYear() >= 2015 && date <= new Date()) {
          dates.push(date)
        }
      }
    }

    const mostRecentDate = dates.length > 0
      ? new Date(Math.max(...dates.map(d => d.getTime())))
      : null

    // Determine age
    let estimatedAge: FreshnessAnalysis['estimatedAge'] = 'unknown'
    if (mostRecentDate) {
      const daysSince = (Date.now() - mostRecentDate.getTime()) / (1000 * 60 * 60 * 24)
      if (daysSince <= 30) estimatedAge = 'fresh'
      else if (daysSince <= 180) estimatedAge = 'recent'
      else if (daysSince <= 365) estimatedAge = 'aging'
      else estimatedAge = 'stale'
    } else if (copyrightYear) {
      if (copyrightYear >= currentYear - 1) estimatedAge = 'recent'
      else if (copyrightYear >= currentYear - 2) estimatedAge = 'aging'
      else estimatedAge = 'stale'
    }

    return {
      copyrightYear,
      isCopyrightCurrent: copyrightYear !== null && copyrightYear >= currentYear - 1,
      hasRecentDates: mostRecentDate !== null &&
        (Date.now() - mostRecentDate.getTime()) < 180 * 24 * 60 * 60 * 1000,
      mostRecentDate,
      lastModifiedHeader: null, // Would need to be passed from HTTP headers
      estimatedAge
    }
  }

  /**
   * Calculate content quality score
   */
  private calculateContentScore(
    blog: BlogAnalysis,
    depth: ContentDepthAnalysis,
    freshness: FreshnessAnalysis
  ): number {
    let score = 0

    // Blog: 35 points max
    if (blog.exists) {
      score += 10
      switch (blog.updateFrequency) {
        case 'daily':
        case 'weekly': score += 20; break
        case 'monthly': score += 15; break
        case 'quarterly': score += 10; break
        case 'yearly': score += 5; break
      }
      if (blog.postCount >= 10) score += 5
    }

    // Content depth: 35 points max
    if (depth.avgPageWordCount >= 500) score += 5
    if (depth.hasLongFormContent) score += 5
    if (depth.hasCaseStudies) score += 8
    if (depth.hasTestimonials) score += 7
    if (depth.hasFAQ) score += 5
    if (depth.hasVideos) score += 5

    // Freshness: 30 points max
    switch (freshness.estimatedAge) {
      case 'fresh': score += 30; break
      case 'recent': score += 20; break
      case 'aging': score += 10; break
      case 'stale': score += 0; break
      default: score += 5
    }

    return Math.min(100, score)
  }

  /**
   * Generate content recommendations
   */
  private generateRecommendations(
    blog: BlogAnalysis,
    depth: ContentDepthAnalysis,
    freshness: FreshnessAnalysis
  ): ContentRecommendation[] {
    const recommendations: ContentRecommendation[] = []

    // Blog recommendations
    if (!blog.exists) {
      recommendations.push({
        type: 'high',
        title: 'Manca un blog',
        description: 'Non è stato trovato un blog o sezione news.',
        impact: 'Un blog attivo migliora SEO e engagement del 40%.'
      })
    } else if (blog.updateFrequency === 'dormant') {
      recommendations.push({
        type: 'high',
        title: 'Blog non aggiornato',
        description: `L'ultimo post risale a oltre un anno fa.`,
        impact: 'Un blog inattivo danneggia la credibilità e il SEO.'
      })
    } else if (blog.updateFrequency === 'yearly' || blog.updateFrequency === 'quarterly') {
      recommendations.push({
        type: 'medium',
        title: 'Blog poco frequente',
        description: `Frequenza aggiornamento: ${blog.updateFrequency}`,
        impact: 'Pubblicare almeno 2-4 articoli al mese migliora il ranking.'
      })
    }

    // Content depth recommendations
    if (!depth.hasTestimonials) {
      recommendations.push({
        type: 'medium',
        title: 'Mancano testimonianze',
        description: 'Non sono state trovate recensioni o testimonianze.',
        impact: 'Le testimonianze aumentano le conversioni del 34%.'
      })
    }

    if (!depth.hasCaseStudies && !depth.hasPortfolio) {
      recommendations.push({
        type: 'medium',
        title: 'Mancano case studies / portfolio',
        description: 'Non ci sono esempi di lavori o risultati.',
        impact: 'I case studies aumentano la fiducia e le conversioni.'
      })
    }

    if (!depth.hasFAQ) {
      recommendations.push({
        type: 'low',
        title: 'Manca sezione FAQ',
        description: 'Non è stata trovata una sezione domande frequenti.',
        impact: 'Le FAQ migliorano UX e possono apparire in featured snippets.'
      })
    }

    if (depth.avgPageWordCount < 300) {
      recommendations.push({
        type: 'medium',
        title: 'Contenuti troppo brevi',
        description: `Contenuto medio: ${depth.avgPageWordCount} parole.`,
        impact: 'Pagine con 1000+ parole rankano meglio su Google.'
      })
    }

    // Freshness recommendations
    if (freshness.estimatedAge === 'stale') {
      recommendations.push({
        type: 'high',
        title: 'Contenuti obsoleti',
        description: 'Il sito sembra non essere aggiornato da tempo.',
        impact: 'Contenuti datati riducono fiducia e ranking.'
      })
    }

    if (!freshness.isCopyrightCurrent && freshness.copyrightYear) {
      recommendations.push({
        type: 'low',
        title: 'Copyright non aggiornato',
        description: `Anno copyright: ${freshness.copyrightYear}`,
        impact: 'Un copyright datato suggerisce abbandono del sito.'
      })
    }

    return recommendations.sort((a, b) => {
      const priority = { critical: 0, high: 1, medium: 2, low: 3 }
      return priority[a.type] - priority[b.type]
    })
  }
}

// Singleton
let globalContentAnalyzer: ContentQualityAnalyzer | null = null

export function getGlobalContentQualityAnalyzer(): ContentQualityAnalyzer {
  if (!globalContentAnalyzer) {
    globalContentAnalyzer = new ContentQualityAnalyzer()
  }
  return globalContentAnalyzer
}
