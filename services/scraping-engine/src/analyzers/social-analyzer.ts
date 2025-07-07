/**
 * SocialAnalyzer - Analizza la presenza e le metriche base dei social di un sito web
 * Utilizzato sia dal job distribuito che dallo script manuale
 *
 * - Estrae link social dal sito
 * - (Opzionale) Usa API pubbliche per metriche base
 * - Restituisce risultati strutturati
 */
import { Page } from 'playwright'

export interface SocialProfile {
  platform: string
  url: string
  found: boolean
  followers?: number
  extra?: Record<string, any>
}

export interface SocialAnalysisResult {
  profiles: SocialProfile[]
  summary: string[]
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
        found: !!foundUrl
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
          await socialPage.close()
          await context.close()
        } catch (e) {
          profile.extra = { error: 'Impossibile analizzare profilo: ' + (e as Error).message }
        }
      }
      profiles.push(profile)
    }
    const summary = profiles.filter(p => p.found).map(p => `Trovato profilo ${p.platform}: ${p.url}`)
    return { profiles, summary }
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
