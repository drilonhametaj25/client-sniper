/**
 * API per sottomettere automaticamente la sitemap ai motori di ricerca
 * Utilizzata da: script di deploy per accelerare indicizzazione
 * Chiamata da: processo di build o trigger manuali
 */

import { NextRequest, NextResponse } from 'next/server'

interface SubmissionResult {
  engine: string
  success: boolean
  status?: number
  error?: string
}

export async function POST(request: NextRequest) {
  try {
    const { urls } = await request.json()
    const sitemapUrl = 'https://trovami.pro/sitemap.xml'
    
    const submissions: Promise<SubmissionResult>[] = [
      // Google Search Console submission
      submitToGoogle(sitemapUrl),
      // Bing Webmaster Tools submission  
      submitToBing(sitemapUrl),
      // IndexNow submission (Microsoft)
      submitToIndexNow(urls || ['https://trovami.pro'])
    ]
    
    const results = await Promise.allSettled(submissions)
    
    const response = results.map((result, index) => {
      const engines = ['Google', 'Bing', 'IndexNow']
      if (result.status === 'fulfilled') {
        return result.value
      } else {
        return {
          engine: engines[index],
          success: false,
          error: result.reason?.message || 'Unknown error'
        }
      }
    })
    
    return NextResponse.json({
      success: true,
      message: 'Sitemap submission completed',
      results: response
    })
    
  } catch (error: any) {
    console.error('Sitemap submission error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Failed to submit sitemap'
      },
      { status: 500 }
    )
  }
}

async function submitToGoogle(sitemapUrl: string): Promise<SubmissionResult> {
  try {
    const pingUrl = `https://www.google.com/ping?sitemap=${encodeURIComponent(sitemapUrl)}`
    const response = await fetch(pingUrl, { method: 'GET' })
    
    return {
      engine: 'Google',
      success: response.ok,
      status: response.status
    }
  } catch (error: any) {
    return {
      engine: 'Google',
      success: false,
      error: error.message
    }
  }
}

async function submitToBing(sitemapUrl: string): Promise<SubmissionResult> {
  try {
    const pingUrl = `https://www.bing.com/ping?sitemap=${encodeURIComponent(sitemapUrl)}`
    const response = await fetch(pingUrl, { method: 'GET' })
    
    return {
      engine: 'Bing',
      success: response.ok,
      status: response.status
    }
  } catch (error: any) {
    return {
      engine: 'Bing',
      success: false,
      error: error.message
    }
  }
}

async function submitToIndexNow(urls: string[]): Promise<SubmissionResult> {
  try {
    const indexNowKey = process.env.INDEXNOW_KEY
    if (!indexNowKey) {
      throw new Error('IndexNow key not configured')
    }
    
    const payload = {
      host: 'trovami.pro',
      key: indexNowKey,
      urlList: urls
    }
    
    const response = await fetch('https://api.indexnow.org/indexnow', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'User-Agent': 'TrovaMi/1.0'
      },
      body: JSON.stringify(payload)
    })
    
    return {
      engine: 'IndexNow',
      success: response.ok,
      status: response.status
    }
  } catch (error: any) {
    return {
      engine: 'IndexNow',
      success: false,
      error: error.message
    }
  }
}

// GET endpoint per test manual submission
export async function GET() {
  return NextResponse.json({
    message: 'Sitemap submission endpoint',
    usage: 'POST with optional { "urls": ["https://trovami.pro/page"] }',
    endpoints: {
      google: 'https://www.google.com/ping',
      bing: 'https://www.bing.com/ping',
      indexnow: 'https://api.indexnow.org/indexnow'
    }
  })
}
