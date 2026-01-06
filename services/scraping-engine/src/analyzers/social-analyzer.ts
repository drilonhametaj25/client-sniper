/**
 * SocialAnalyzer - Analizza la presenza e le metriche base dei social di un sito web
 * Versione Enhanced con reputation analysis, activity status e brand health
 *
 * - Estrae link social dal sito
 * - Analizza attività profili (attivo/dormiente)
 * - Aggrega reputation da review platforms
 * - Calcola brand health score
 */
import { Page } from 'playwright'

export interface SocialProfile {
  platform: string
  url: string
  found: boolean
  followers?: number
  isActive: boolean
  lastPostDate?: string
  postFrequency: 'daily' | 'weekly' | 'monthly' | 'dormant' | 'unknown'
  engagementRate?: number
  extra?: Record<string, any>
}

export interface ReviewPlatform {
  platform: string
  rating: number
  reviewCount: number
  url?: string
}

export interface ReputationAnalysis {
  avgRating: number
  totalReviews: number
  platforms: ReviewPlatform[]
  sentiment: 'positive' | 'neutral' | 'negative'
  responseRate: number
  recentReviewsSentiment?: 'improving' | 'stable' | 'declining'
}

export interface SocialAnalysisResult {
  profiles: SocialProfile[]
  summary: string[]
  // Enhanced fields
  reputation: ReputationAnalysis
  brandHealth: number // 0-100
  socialOpportunities: string[]
  activeProfileCount: number
  dormantProfileCount: number
  totalFollowers: number
  avgEngagementRate: number
}

export class SocialAnalyzer {
  static knownPlatforms = [
    { name: 'facebook', pattern: /facebook\.com\//i },
    { name: 'instagram', pattern: /instagram\.com\//i },
    { name: 'linkedin', pattern: /linkedin\.com\//i },
    { name: 'twitter', pattern: /twitter\.com\//i },
    { name: 'youtube', pattern: /youtube\.com\//i },
    { name: 'tiktok', pattern: /tiktok\.com\//i },
    { name: 'pinterest', pattern: /pinterest\.com\//i },
    { name: 'telegram', pattern: /t.me\//i },
    { name: 'whatsapp', pattern: /wa.me\//i },
    { name: 'threads', pattern: /threads\.net\//i }
  ]

  /**
   * Analizza la presenza dei social su una pagina web
   */
  async analyzeSocials(page: Page): Promise<SocialAnalysisResult> {
    const links = await page.$$eval('a', (as) => as.map(a => a.href))
    const profiles: SocialProfile[] = []

    for (const platform of SocialAnalyzer.knownPlatforms) {
      const foundUrl = links.find(url => platform.pattern.test(url))
      let profile: SocialProfile = {
        platform: platform.name,
        url: foundUrl || '',
        found: !!foundUrl,
        isActive: false,
        postFrequency: 'unknown'
      }

      if (foundUrl) {
        try {
          // Usa un nuovo browser context per ogni profilo social
          const browser = page.context().browser?.()
          if (!browser) throw new Error('Browser non disponibile')
          const context = await browser.newContext({
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            locale: 'it-IT',
            viewport: { width: 1200, height: 900 }
          })
          const socialPage = await context.newPage()
          await socialPage.goto(foundUrl, { waitUntil: 'domcontentloaded', timeout: 35000 })
          await socialPage.waitForTimeout(4000)

          if (platform.name === 'facebook') {
            profile = await this.analyzeFacebook(socialPage, profile)
          } else if (platform.name === 'instagram') {
            profile = await this.analyzeInstagram(socialPage, profile)
          } else if (platform.name === 'linkedin') {
            profile = await this.analyzeLinkedIn(socialPage, profile)
          } else if (platform.name === 'twitter') {
            profile = await this.analyzeTwitter(socialPage, profile)
          } else if (platform.name === 'youtube') {
            profile = await this.analyzeYouTube(socialPage, profile)
          }

          // Determine activity status from extra data
          profile = this.determineActivityStatus(profile)

          await socialPage.close()
          await context.close()
        } catch (e) {
          profile.extra = { error: 'Impossibile analizzare profilo: ' + (e as Error).message }
        }
      }
      profiles.push(profile)
    }

    // Analyze reputation from page
    const reputation = await this.analyzeReputation(page)

    // Calculate metrics
    const activeProfileCount = profiles.filter(p => p.found && p.isActive).length
    const dormantProfileCount = profiles.filter(p => p.found && !p.isActive).length
    const totalFollowers = profiles.reduce((sum, p) => sum + (p.followers || 0), 0)

    const engagementRates = profiles.filter(p => p.engagementRate !== undefined).map(p => p.engagementRate!)
    const avgEngagementRate = engagementRates.length > 0
      ? Math.round((engagementRates.reduce((a, b) => a + b, 0) / engagementRates.length) * 100) / 100
      : 0

    // Calculate brand health
    const brandHealth = this.calculateBrandHealth(profiles, reputation)

    // Generate opportunities
    const socialOpportunities = this.generateSocialOpportunities(profiles, reputation)

    const summary = profiles.filter(p => p.found).map(p =>
      `Trovato profilo ${p.platform}: ${p.url}${p.isActive ? ' (attivo)' : ' (dormiente)'}`
    )

    return {
      profiles,
      summary,
      reputation,
      brandHealth,
      socialOpportunities,
      activeProfileCount,
      dormantProfileCount,
      totalFollowers,
      avgEngagementRate
    }
  }

  /**
   * Determine activity status based on profile data
   */
  private determineActivityStatus(profile: SocialProfile): SocialProfile {
    // Check engagement rate and last post date
    if (profile.extra?.lastPostDate) {
      const lastPost = new Date(profile.extra.lastPostDate)
      const daysSincePost = Math.floor((Date.now() - lastPost.getTime()) / (1000 * 60 * 60 * 24))

      if (daysSincePost <= 7) {
        profile.postFrequency = 'daily'
        profile.isActive = true
      } else if (daysSincePost <= 30) {
        profile.postFrequency = 'weekly'
        profile.isActive = true
      } else if (daysSincePost <= 90) {
        profile.postFrequency = 'monthly'
        profile.isActive = false
      } else {
        profile.postFrequency = 'dormant'
        profile.isActive = false
      }

      profile.lastPostDate = lastPost.toISOString()
    } else if (profile.extra?.engagementRate !== undefined) {
      // If we have engagement rate but no post date, assume active if engagement > 0
      profile.isActive = profile.extra.engagementRate > 0
      profile.postFrequency = profile.isActive ? 'unknown' : 'dormant'
    } else if (profile.followers && profile.followers > 100) {
      // Assume somewhat active if they have followers
      profile.isActive = true
      profile.postFrequency = 'unknown'
    }

    // Copy engagement rate to main profile
    if (profile.extra?.engagementRate !== undefined) {
      profile.engagementRate = profile.extra.engagementRate
    }

    return profile
  }

  /**
   * Analyze reputation from reviews on the page
   */
  private async analyzeReputation(page: Page): Promise<ReputationAnalysis> {
    try {
      return await page.evaluate(() => {
        const text = document.body.innerText.toLowerCase()
        const html = document.body.innerHTML.toLowerCase()

        const platforms: Array<{ platform: string; rating: number; reviewCount: number; url?: string }> = []

        // Google Reviews detection
        const googleRatingMatch = text.match(/(\d[.,]\d)\s*(?:\/\s*5|stelle|stars)/)
        const googleReviewMatch = text.match(/(\d+)\s*(?:recensioni|reviews)/)
        if (googleRatingMatch || googleReviewMatch) {
          platforms.push({
            platform: 'Google',
            rating: googleRatingMatch ? parseFloat(googleRatingMatch[1].replace(',', '.')) : 0,
            reviewCount: googleReviewMatch ? parseInt(googleReviewMatch[1]) : 0
          })
        }

        // Facebook detection (from page or widgets)
        if (html.includes('facebook') && (text.includes('mi piace') || text.includes('like'))) {
          const fbRatingMatch = text.match(/(\d[.,]\d)\s*(?:su\s*5|\/\s*5)/)
          if (fbRatingMatch) {
            platforms.push({
              platform: 'Facebook',
              rating: parseFloat(fbRatingMatch[1].replace(',', '.')),
              reviewCount: 0
            })
          }
        }

        // TrustPilot detection
        if (html.includes('trustpilot')) {
          const tpMatch = text.match(/trustpilot.*?(\d[.,]\d)/)
          if (tpMatch) {
            platforms.push({
              platform: 'TrustPilot',
              rating: parseFloat(tpMatch[1].replace(',', '.')),
              reviewCount: 0
            })
          }
        }

        // TripAdvisor detection
        if (html.includes('tripadvisor')) {
          const taMatch = text.match(/tripadvisor.*?(\d[.,]\d)/)
          if (taMatch) {
            platforms.push({
              platform: 'TripAdvisor',
              rating: parseFloat(taMatch[1].replace(',', '.')),
              reviewCount: 0
            })
          }
        }

        // Calculate aggregates
        const ratingsWithValue = platforms.filter(p => p.rating > 0)
        const avgRating = ratingsWithValue.length > 0
          ? Math.round((ratingsWithValue.reduce((sum, p) => sum + p.rating, 0) / ratingsWithValue.length) * 10) / 10
          : 0

        const totalReviews = platforms.reduce((sum, p) => sum + p.reviewCount, 0)

        // Determine sentiment
        let sentiment: 'positive' | 'neutral' | 'negative' = 'neutral'
        if (avgRating >= 4) sentiment = 'positive'
        else if (avgRating > 0 && avgRating < 3) sentiment = 'negative'

        return {
          avgRating,
          totalReviews,
          platforms,
          sentiment,
          responseRate: 0 // Would need additional analysis
        }
      })
    } catch {
      return {
        avgRating: 0,
        totalReviews: 0,
        platforms: [],
        sentiment: 'neutral',
        responseRate: 0
      }
    }
  }

  /**
   * Calculate overall brand health score
   */
  private calculateBrandHealth(profiles: SocialProfile[], reputation: ReputationAnalysis): number {
    let score = 0

    // Social presence (40%)
    const foundProfiles = profiles.filter(p => p.found).length
    const totalPlatforms = profiles.length
    score += (foundProfiles / totalPlatforms) * 20

    // Activity status (20%)
    const activeProfiles = profiles.filter(p => p.found && p.isActive).length
    const foundCount = profiles.filter(p => p.found).length
    if (foundCount > 0) {
      score += (activeProfiles / foundCount) * 20
    }

    // Reputation (30%)
    if (reputation.avgRating > 0) {
      score += (reputation.avgRating / 5) * 30
    }

    // Review volume (10%)
    if (reputation.totalReviews > 100) score += 10
    else if (reputation.totalReviews > 50) score += 7
    else if (reputation.totalReviews > 10) score += 4

    return Math.round(Math.min(100, score))
  }

  /**
   * Generate social/reputation opportunities
   */
  private generateSocialOpportunities(profiles: SocialProfile[], reputation: ReputationAnalysis): string[] {
    const opportunities: string[] = []

    // Missing key platforms
    const keyPlatforms = ['facebook', 'instagram', 'linkedin']
    keyPlatforms.forEach(platform => {
      const profile = profiles.find(p => p.platform === platform)
      if (!profile?.found) {
        opportunities.push(`Creare profilo ${platform.charAt(0).toUpperCase() + platform.slice(1)}`)
      }
    })

    // Dormant profiles
    const dormantProfiles = profiles.filter(p => p.found && !p.isActive)
    if (dormantProfiles.length > 0) {
      opportunities.push(`Riattivare profili dormienti: ${dormantProfiles.map(p => p.platform).join(', ')}`)
    }

    // Low engagement
    const lowEngagement = profiles.filter(p => p.engagementRate !== undefined && p.engagementRate < 1)
    if (lowEngagement.length > 0) {
      opportunities.push('Migliorare engagement con contenuti più interattivi')
    }

    // Reputation opportunities
    if (reputation.avgRating === 0) {
      opportunities.push('Iniziare a raccogliere e mostrare recensioni clienti')
    } else if (reputation.avgRating < 4) {
      opportunities.push('Migliorare rating medio rispondendo a recensioni negative')
    }

    if (reputation.totalReviews < 20) {
      opportunities.push('Incentivare clienti a lasciare recensioni')
    }

    // Google Business
    if (!profiles.find(p => p.platform === 'google_business')?.found) {
      opportunities.push('Ottimizzare scheda Google Business Profile')
    }

    return opportunities.slice(0, 6)
  }

  // Analisi Facebook avanzata
  private async analyzeFacebook(page: Page, profile: SocialProfile): Promise<SocialProfile> {
    try {
      const text = await page.content()
      const followersMatch = text.match(/([0-9.,]+) (follower|persone che seguono)/i)
      const likesMatch = text.match(/([0-9.,]+) (mi piace|likes)/i)
      const followers = followersMatch ? parseInt(followersMatch[1].replace(/\D/g, '')) : undefined
      const likes = likesMatch ? parseInt(likesMatch[1].replace(/\D/g, '')) : undefined
      profile.followers = followers
      profile.extra = { ...profile.extra, likes }
      // Engagement: estrai sample post e calcola media like/commenti
      const posts = await page.$$eval('div[role="article"]', divs => divs.slice(0,5).map(d => d.textContent || ''))
      const likeCounts: number[] = []
      const commentCounts: number[] = []
      for (const post of posts) {
        const likeMatch = post.match(/([0-9.,]+) (Mi piace|Like)/i)
        if (likeMatch) likeCounts.push(parseInt(likeMatch[1].replace(/\D/g, '')))
        const commentMatch = post.match(/([0-9.,]+) (Commenta|Commenti|Comments)/i)
        if (commentMatch) commentCounts.push(parseInt(commentMatch[1].replace(/\D/g, '')))
      }
      const avgLikes = likeCounts.length ? Math.round(likeCounts.reduce((a,b)=>a+b,0)/likeCounts.length) : undefined
      const avgComments = commentCounts.length ? Math.round(commentCounts.reduce((a,b)=>a+b,0)/commentCounts.length) : undefined
      let engagementRate = undefined
      if (followers && avgLikes !== undefined)
        engagementRate = Math.round(((avgLikes + (avgComments||0)) / followers) * 10000) / 100 // percentuale
      profile.extra = {
        ...profile.extra,
        engagementSample: posts,
        avgLikes,
        avgComments,
        engagementRate
      }
    } catch {}
    return profile
  }

  // Analisi Instagram avanzata
  private async analyzeInstagram(page: Page, profile: SocialProfile): Promise<SocialProfile> {
    try {
      // 1. Prova a estrarre followers da HTML classico
      let followers: string | null = null
      try {
        followers = await page.$eval('header section ul li:nth-child(2) span', el => el.getAttribute('title') || el.textContent)
      } catch {}
      // 2. Fallback: cerca JSON LD o script inline
      if (!followers) {
        const html = await page.content()
        const jsonMatch = html.match(/"edge_followed_by":\{"count":(\d+)}/)
        if (jsonMatch) followers = jsonMatch[1]
      }
      profile.followers = followers ? parseInt(followers.replace(/\D/g, '')) : undefined
      // Engagement: like/commenti ultimi post
      let posts: string[] = []
      try {
        posts = await page.$$eval('article a[href*="/p/"]', as => as.slice(0,5).map(a => a.textContent || ''))
      } catch {}
      // Fallback: cerca numeri da script
      if (!posts.length) {
        const html = await page.content()
        const postMatches = html.match(/"edge_liked_by":\{"count":(\d+)}/g)
        if (postMatches) posts = postMatches.map(m => m)
      }
      const likeCounts: number[] = []
      const commentCounts: number[] = []
      for (const post of posts) {
        const likeMatch = post.match(/([0-9.,]+) (Mi piace|Like)/i)
        if (likeMatch) likeCounts.push(parseInt(likeMatch[1].replace(/\D/g, '')))
        const commentMatch = post.match(/([0-9.,]+) (Commenti|Comments)/i)
        if (commentMatch) commentCounts.push(parseInt(commentMatch[1].replace(/\D/g, '')))
        // Fallback: edge_liked_by json
        const edgeLikeMatch = post.match(/"edge_liked_by":\{"count":(\d+)}/)
        if (edgeLikeMatch) likeCounts.push(parseInt(edgeLikeMatch[1]))
      }
      const avgLikes = likeCounts.length ? Math.round(likeCounts.reduce((a,b)=>a+b,0)/likeCounts.length) : undefined
      const avgComments = commentCounts.length ? Math.round(commentCounts.reduce((a,b)=>a+b,0)/commentCounts.length) : undefined
      let engagementRate = undefined
      if (profile.followers && avgLikes !== undefined)
        engagementRate = Math.round(((avgLikes + (avgComments||0)) / profile.followers) * 10000) / 100
      profile.extra = {
        ...profile.extra,
        engagementSample: posts,
        avgLikes,
        avgComments,
        engagementRate
      }
    } catch (e) {
      profile.extra = { ...profile.extra, error: 'Instagram parsing error: ' + (e as Error).message }
    }
    return profile
  }

  // Analisi LinkedIn
  private async analyzeLinkedIn(page: Page, profile: SocialProfile): Promise<SocialProfile> {
    try {
      const text = await page.content()
      const followersMatch = text.match(/([0-9.,]+) follower/i)
      profile.followers = followersMatch ? parseInt(followersMatch[1].replace(/\D/g, '')) : undefined
    } catch {}
    return profile
  }

  // Analisi Twitter
  private async analyzeTwitter(page: Page, profile: SocialProfile): Promise<SocialProfile> {
    try {
      const text = await page.content()
      const followersMatch = text.match(/([0-9.,]+) follower/i)
      profile.followers = followersMatch ? parseInt(followersMatch[1].replace(/\D/g, '')) : undefined
    } catch {}
    return profile
  }

  // Analisi YouTube
  private async analyzeYouTube(page: Page, profile: SocialProfile): Promise<SocialProfile> {
    try {
      const text = await page.content()
      const subMatch = text.match(/([0-9.,]+) (iscritti|subscribers)/i)
      profile.followers = subMatch ? parseInt(subMatch[1].replace(/\D/g, '')) : undefined
      const videoViews = await page.$$eval('#metadata-line span', spans => spans.map(s => s.textContent || '').filter(t => /visualizzazioni|views/i.test(t)))
      const viewCounts = videoViews.map(t => {
        const m = t.match(/([0-9.,]+)/)
        return m ? parseInt(m[1].replace(/\D/g, '')) : null
      }).filter(Boolean) as number[]
      const avgViews = viewCounts.length ? Math.round(viewCounts.reduce((a,b)=>a+b,0)/viewCounts.length) : undefined
      profile.extra = { ...profile.extra, avgViews }
    } catch {}
    return profile
  }

  // ...existing code...
}
