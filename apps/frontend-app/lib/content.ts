/**
 * Sistema di gestione contenuti blog per TrovaMi
 * Utilizzato da: pagine blog per caricare contenuti markdown
 * Gestito da: sistema di build Next.js per contenuti statici
 */

import fs from 'fs'
import path from 'path'
import matter from 'gray-matter'

const contentDirectory = path.join(process.cwd(), 'content/blog')

export function getPostContent(slug: string): string {
  try {
    const fullPath = path.join(contentDirectory, `${slug}.md`)
    
    if (!fs.existsSync(fullPath)) {
      return `
# Contenuto in Arrivo

Questo articolo fa parte della strategia SEO di TrovaMi. Il contenuto completo sarà disponibile a breve.

Nel frattempo, puoi:
- Esplorare altri articoli del blog
- Provare TrovaMi gratuitamente per trovare i tuoi primi clienti
- Iscriverti alla newsletter per aggiornamenti

[Prova TrovaMi Gratis →](/register)
      `
    }

    const fileContents = fs.readFileSync(fullPath, 'utf8')
    const { content } = matter(fileContents)
    return content
  } catch (error) {
    console.error(`Error reading content for ${slug}:`, error)
    return `
# Contenuto Non Disponibile

Si è verificato un errore nel caricamento di questo articolo.

[Torna al Blog →](/blog)
    `
  }
}

export function getAllContentSlugs(): string[] {
  try {
    if (!fs.existsSync(contentDirectory)) {
      return []
    }
    
    const files = fs.readdirSync(contentDirectory)
    return files
      .filter(file => file.endsWith('.md'))
      .map(file => file.replace(/\.md$/, ''))
  } catch (error) {
    console.error('Error reading content directory:', error)
    return []
  }
}
