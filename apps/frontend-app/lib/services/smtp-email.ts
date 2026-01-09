/**
 * Servizio Email SMTP per TrovaMi
 * Usa Nodemailer per inviare email direttamente via SMTP
 *
 * Configurazione richiesta in .env.local:
 * - SMTP_HOST (es: smtp.gmail.com, smtp.sendgrid.net)
 * - SMTP_PORT (es: 587 per TLS, 465 per SSL)
 * - SMTP_USER (email o username)
 * - SMTP_PASS (password o app password)
 * - SMTP_FROM (es: "TrovaMi <noreply@trovami.pro>")
 */

import nodemailer from 'nodemailer'

interface EmailOptions {
  to: string
  subject: string
  html: string
  text?: string
}

class SMTPEmailService {
  private transporter: nodemailer.Transporter | null = null
  private fromAddress: string

  constructor() {
    this.fromAddress = process.env.SMTP_FROM || 'TrovaMi <noreply@trovami.pro>'
    this.initTransporter()
  }

  private initTransporter() {
    const host = process.env.SMTP_HOST
    const port = parseInt(process.env.SMTP_PORT || '587')
    const user = process.env.SMTP_USER
    const pass = process.env.SMTP_PASS

    if (!host || !user || !pass) {
      console.warn('⚠️ SMTP non configurato. Imposta SMTP_HOST, SMTP_USER, SMTP_PASS')
      return
    }

    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465, // true per 465, false per altri
      auth: {
        user,
        pass
      }
    })
  }

  async sendEmail(options: EmailOptions): Promise<boolean> {
    if (!this.transporter) {
      console.error('❌ SMTP transporter non inizializzato')
      return false
    }

    try {
      await this.transporter.sendMail({
        from: this.fromAddress,
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text || this.stripHtml(options.html)
      })
      console.log(`✅ Email inviata a ${options.to}`)
      return true
    } catch (error) {
      console.error('❌ Errore invio email:', error)
      return false
    }
  }

  private stripHtml(html: string): string {
    return html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim()
  }

  // =====================================================
  // TEMPLATE: Crediti Bassi
  // =====================================================
  async sendCreditsLowEmail(email: string, creditsRemaining: number, plan: string): Promise<boolean> {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
        <div style="max-width: 600px; margin: 40px auto; background-color: white; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); overflow: hidden;">

          <div style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); padding: 30px; text-align: center;">
            <div style="font-size: 40px; margin-bottom: 10px;">⚡</div>
            <h1 style="color: white; margin: 0; font-size: 24px;">Crediti in Esaurimento</h1>
          </div>

          <div style="padding: 30px;">
            <p style="color: #4a5568; line-height: 1.6; font-size: 16px;">
              Ciao! Ti rimangono solo <strong style="color: #d97706; font-size: 20px;">${creditsRemaining} crediti</strong> nel tuo piano ${plan}.
            </p>

            <p style="color: #4a5568; line-height: 1.6; font-size: 16px;">
              Non perdere l'accesso ai migliori lead! Fai l'upgrade per continuare a trovare nuovi clienti.
            </p>

            <div style="text-align: center; margin: 30px 0;">
              <a href="https://trovami.pro/upgrade"
                 style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                        color: white;
                        text-decoration: none;
                        padding: 14px 28px;
                        border-radius: 8px;
                        font-weight: 600;
                        font-size: 16px;
                        display: inline-block;">
                Ottieni più crediti
              </a>
            </div>

            <div style="background-color: #fef3c7; padding: 15px; border-radius: 8px; border-left: 4px solid #f59e0b;">
              <p style="color: #92400e; margin: 0; font-size: 14px;">
                <strong>Suggerimento:</strong> Con il piano Pro ottieni crediti illimitati e accesso a tutte le funzionalità avanzate!
              </p>
            </div>
          </div>

          <div style="background-color: #f7fafc; padding: 20px; text-align: center; border-top: 1px solid #e2e8f0;">
            <p style="color: #a0aec0; margin: 0; font-size: 12px;">
              © 2025 TrovaMi - Trova clienti potenziali con difetti tecnici
            </p>
          </div>
        </div>
      </body>
      </html>
    `

    return this.sendEmail({
      to: email,
      subject: `⚡ Ti rimangono solo ${creditsRemaining} crediti - TrovaMi`,
      html
    })
  }

  // =====================================================
  // TEMPLATE: Crediti Esauriti
  // =====================================================
  async sendCreditsDepletedEmail(email: string, plan: string): Promise<boolean> {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
        <div style="max-width: 600px; margin: 40px auto; background-color: white; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); overflow: hidden;">

          <div style="background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); padding: 30px; text-align: center;">
            <div style="font-size: 40px; margin-bottom: 10px;">🔴</div>
            <h1 style="color: white; margin: 0; font-size: 24px;">Crediti Esauriti</h1>
          </div>

          <div style="padding: 30px;">
            <p style="color: #4a5568; line-height: 1.6; font-size: 16px;">
              I tuoi crediti sono terminati. Non puoi più sbloccare nuovi lead finché non fai l'upgrade.
            </p>

            <p style="color: #4a5568; line-height: 1.6; font-size: 16px;">
              Ogni giorno perdi opportunità di business. Fai l'upgrade ora per continuare a crescere!
            </p>

            <div style="text-align: center; margin: 30px 0;">
              <a href="https://trovami.pro/upgrade"
                 style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                        color: white;
                        text-decoration: none;
                        padding: 14px 28px;
                        border-radius: 8px;
                        font-weight: 600;
                        font-size: 16px;
                        display: inline-block;">
                Ricarica Crediti Ora
              </a>
            </div>

            <div style="background-color: #f0fdf4; padding: 20px; border-radius: 8px; margin-top: 20px;">
              <h3 style="color: #166534; margin: 0 0 10px 0; font-size: 16px;">Cosa ottieni con Pro:</h3>
              <ul style="color: #4a5568; margin: 0; padding-left: 20px; line-height: 1.8;">
                <li>Crediti illimitati ogni mese</li>
                <li>Accesso al CRM integrato</li>
                <li>Template di contatto personalizzati</li>
                <li>Alert per nuovi lead</li>
              </ul>
            </div>
          </div>

          <div style="background-color: #f7fafc; padding: 20px; text-align: center; border-top: 1px solid #e2e8f0;">
            <p style="color: #a0aec0; margin: 0; font-size: 12px;">
              © 2025 TrovaMi
            </p>
          </div>
        </div>
      </body>
      </html>
    `

    return this.sendEmail({
      to: email,
      subject: '🔴 Crediti esauriti - Ricarica per continuare - TrovaMi',
      html
    })
  }

  // =====================================================
  // TEMPLATE: Utente Inattivo
  // =====================================================
  async sendInactiveUserEmail(
    email: string,
    daysSinceLogin: number,
    creditsRemaining: number
  ): Promise<boolean> {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
        <div style="max-width: 600px; margin: 40px auto; background-color: white; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); overflow: hidden;">

          <div style="background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%); padding: 30px; text-align: center;">
            <div style="font-size: 40px; margin-bottom: 10px;">👋</div>
            <h1 style="color: white; margin: 0; font-size: 24px;">Ci manchi!</h1>
          </div>

          <div style="padding: 30px;">
            <p style="color: #4a5568; line-height: 1.6; font-size: 16px;">
              Non ti vediamo da <strong>${daysSinceLogin} giorni</strong>. Nel frattempo, abbiamo trovato tanti nuovi lead che potrebbero interessarti!
            </p>

            ${creditsRemaining > 0 ? `
            <div style="background-color: #dbeafe; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <p style="color: #1e40af; margin: 0; font-size: 14px;">
                <strong>Hai ancora ${creditsRemaining} crediti</strong> disponibili da usare!
              </p>
            </div>
            ` : ''}

            <p style="color: #4a5568; line-height: 1.6; font-size: 16px;">
              I tuoi competitor potrebbero star contattando i lead che stai perdendo. Torna a trovarci!
            </p>

            <div style="text-align: center; margin: 30px 0;">
              <a href="https://trovami.pro/dashboard"
                 style="background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%);
                        color: white;
                        text-decoration: none;
                        padding: 14px 28px;
                        border-radius: 8px;
                        font-weight: 600;
                        font-size: 16px;
                        display: inline-block;">
                Scopri i nuovi lead
              </a>
            </div>
          </div>

          <div style="background-color: #f7fafc; padding: 20px; text-align: center; border-top: 1px solid #e2e8f0;">
            <p style="color: #a0aec0; margin: 0; font-size: 12px;">
              © 2025 TrovaMi
            </p>
          </div>
        </div>
      </body>
      </html>
    `

    return this.sendEmail({
      to: email,
      subject: `👋 Ci manchi! Nuovi lead ti aspettano - TrovaMi`,
      html
    })
  }

  // =====================================================
  // TEMPLATE: Nuovi Lead Disponibili (Saved Search Alert)
  // =====================================================
  async sendNewLeadsEmail(
    email: string,
    count: number,
    categories: string[],
    cities: string[],
    bestScore: number
  ): Promise<boolean> {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
        <div style="max-width: 600px; margin: 40px auto; background-color: white; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); overflow: hidden;">

          <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 30px; text-align: center;">
            <div style="font-size: 40px; margin-bottom: 10px;">🎯</div>
            <h1 style="color: white; margin: 0; font-size: 24px;">${count} Nuovi Lead!</h1>
          </div>

          <div style="padding: 30px;">
            <p style="color: #4a5568; line-height: 1.6; font-size: 16px;">
              Abbiamo trovato <strong style="color: #059669; font-size: 20px;">${count} nuovi lead</strong> che corrispondono ai tuoi criteri di ricerca!
            </p>

            <div style="background-color: #f0fdf4; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="color: #166534; margin: 0 0 15px 0; font-size: 16px;">Riepilogo:</h3>
              <ul style="color: #4a5568; margin: 0; padding-left: 20px; line-height: 1.8;">
                ${categories.length > 0 ? `<li><strong>Categorie:</strong> ${categories.join(', ')}</li>` : ''}
                ${cities.length > 0 ? `<li><strong>Città:</strong> ${cities.join(', ')}</li>` : ''}
                <li><strong>Miglior punteggio:</strong> ${bestScore}/100 (più è basso, meglio è!)</li>
              </ul>
            </div>

            <div style="text-align: center; margin: 30px 0;">
              <a href="https://trovami.pro/dashboard"
                 style="background: linear-gradient(135deg, #10b981 0%, #059669 100%);
                        color: white;
                        text-decoration: none;
                        padding: 14px 28px;
                        border-radius: 8px;
                        font-weight: 600;
                        font-size: 16px;
                        display: inline-block;">
                Scopri i nuovi lead
              </a>
            </div>

            <p style="color: #718096; line-height: 1.6; font-size: 14px; text-align: center;">
              Non perdere tempo! I lead migliori vengono contattati per primi.
            </p>
          </div>

          <div style="background-color: #f7fafc; padding: 20px; text-align: center; border-top: 1px solid #e2e8f0;">
            <p style="color: #a0aec0; margin: 0; font-size: 12px;">
              Stai ricevendo questa email perché hai attivato gli alert per la tua ricerca salvata.
            </p>
          </div>
        </div>
      </body>
      </html>
    `

    return this.sendEmail({
      to: email,
      subject: `🎯 ${count} nuovi lead trovati per te! - TrovaMi`,
      html
    })
  }

  // =====================================================
  // TEMPLATE: Crediti Rinnovati
  // =====================================================
  async sendCreditsRenewedEmail(
    email: string,
    plan: string,
    newCredits: number,
    nextRenewalDate: string
  ): Promise<boolean> {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
        <div style="max-width: 600px; margin: 40px auto; background-color: white; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); overflow: hidden;">

          <div style="background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%); padding: 30px; text-align: center;">
            <div style="font-size: 40px; margin-bottom: 10px;">🎉</div>
            <h1 style="color: white; margin: 0; font-size: 24px;">Crediti Rinnovati!</h1>
          </div>

          <div style="padding: 30px;">
            <p style="color: #4a5568; line-height: 1.6; font-size: 16px;">
              Ottima notizia! I tuoi crediti sono stati rinnovati.
            </p>

            <div style="background-color: #f5f3ff; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center;">
              <p style="color: #7c3aed; margin: 0 0 5px 0; font-size: 14px; text-transform: uppercase;">Piano ${plan}</p>
              <p style="color: #5b21b6; margin: 0; font-size: 36px; font-weight: bold;">${newCredits}</p>
              <p style="color: #7c3aed; margin: 5px 0 0 0; font-size: 14px;">crediti disponibili</p>
            </div>

            <p style="color: #718096; line-height: 1.6; font-size: 14px;">
              Prossimo rinnovo: <strong>${nextRenewalDate}</strong>
            </p>

            <div style="text-align: center; margin: 30px 0;">
              <a href="https://trovami.pro/dashboard"
                 style="background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%);
                        color: white;
                        text-decoration: none;
                        padding: 14px 28px;
                        border-radius: 8px;
                        font-weight: 600;
                        font-size: 16px;
                        display: inline-block;">
                Inizia a usarli!
              </a>
            </div>
          </div>

          <div style="background-color: #f7fafc; padding: 20px; text-align: center; border-top: 1px solid #e2e8f0;">
            <p style="color: #a0aec0; margin: 0; font-size: 12px;">
              © 2025 TrovaMi
            </p>
          </div>
        </div>
      </body>
      </html>
    `

    return this.sendEmail({
      to: email,
      subject: `🎉 I tuoi ${newCredits} crediti sono pronti! - TrovaMi`,
      html
    })
  }

  // =====================================================
  // TEMPLATE: Newsletter NUOVI (Mai usato crediti)
  // =====================================================
  async sendNewsletterNuovi(
    email: string,
    unsubscribeToken: string,
    data: {
      usersStartedThisWeek: number
      sampleLeads: Array<{
        business_name: string
        city: string
        category: string
        score: number
      }>
    }
  ): Promise<boolean> {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://trovami.pro'
    const unsubscribeUrl = `${appUrl}/api/newsletter/unsubscribe?token=${unsubscribeToken}`

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
        <div style="max-width: 600px; margin: 40px auto; background-color: white; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); overflow: hidden;">

          <!-- Header -->
          <div style="background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%); padding: 30px; text-align: center;">
            <div style="font-size: 40px; margin-bottom: 10px;">🎁</div>
            <h1 style="color: white; margin: 0; font-size: 24px;">I tuoi 5 crediti gratuiti ti aspettano!</h1>
          </div>

          <div style="padding: 30px;">
            <p style="color: #4a5568; line-height: 1.6; font-size: 16px;">
              Ciao! Hai ancora <strong style="color: #6366f1; font-size: 20px;">5 crediti gratuiti</strong> da usare per scoprire nuovi potenziali clienti.
            </p>

            <p style="color: #4a5568; line-height: 1.6; font-size: 16px;">
              TrovaMi ti aiuta a trovare aziende con problemi tecnici sul loro sito web - il target perfetto per agenzie e freelancer digitali!
            </p>

            <!-- FOMO Section -->
            <div style="background-color: #fef3c7; padding: 15px; border-radius: 8px; border-left: 4px solid #f59e0b; margin: 20px 0;">
              <p style="color: #92400e; margin: 0; font-size: 14px;">
                <strong>⚡ Altri ${data.usersStartedThisWeek} utenti</strong> hanno gia iniziato questa settimana a trovare nuovi clienti!
              </p>
            </div>

            <!-- Sample Leads Preview -->
            <div style="margin: 25px 0;">
              <h3 style="color: #1a202c; font-size: 16px; margin-bottom: 15px;">Ecco un assaggio dei lead disponibili:</h3>
              ${data.sampleLeads.slice(0, 3).map(lead => `
                <div style="background-color: #f7fafc; padding: 12px; border-radius: 8px; margin-bottom: 10px;">
                  <div style="font-weight: 600; color: #1a202c;">${lead.business_name}</div>
                  <div style="font-size: 13px; color: #718096;">${lead.category} - ${lead.city}</div>
                  <div style="font-size: 12px; color: ${lead.score <= 40 ? '#e53e3e' : '#718096'}; margin-top: 4px;">
                    Score: ${lead.score}/100 ${lead.score <= 40 ? '🔥 Alto potenziale!' : ''}
                  </div>
                </div>
              `).join('')}
            </div>

            <!-- How it works -->
            <div style="background-color: #f0fdf4; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="color: #166534; margin: 0 0 15px 0; font-size: 16px;">Come funziona:</h3>
              <ol style="color: #4a5568; margin: 0; padding-left: 20px; line-height: 1.8;">
                <li>Scegli la categoria e citta che ti interessano</li>
                <li>Sblocca i lead con i tuoi crediti gratuiti</li>
                <li>Contatta le aziende proponendo i tuoi servizi</li>
              </ol>
            </div>

            <div style="text-align: center; margin: 30px 0;">
              <a href="${appUrl}/dashboard"
                 style="background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%);
                        color: white;
                        text-decoration: none;
                        padding: 14px 28px;
                        border-radius: 8px;
                        font-weight: 600;
                        font-size: 16px;
                        display: inline-block;">
                Inizia Ora - E Gratis!
              </a>
            </div>
          </div>

          <!-- Footer -->
          <div style="background-color: #f7fafc; padding: 20px; text-align: center; border-top: 1px solid #e2e8f0;">
            <p style="color: #a0aec0; margin: 0 0 10px 0; font-size: 12px;">
              © 2025 TrovaMi - Trova clienti potenziali con difetti tecnici
            </p>
            <p style="margin: 0;">
              <a href="${unsubscribeUrl}" style="color: #a0aec0; font-size: 11px; text-decoration: underline;">
                Non vuoi piu ricevere queste email? Clicca qui per disiscriverti
              </a>
            </p>
          </div>
        </div>
      </body>
      </html>
    `

    return this.sendEmail({
      to: email,
      subject: '🎁 I tuoi 5 crediti gratuiti ti aspettano! - TrovaMi',
      html
    })
  }

  // =====================================================
  // TEMPLATE: Newsletter DORMIENTI (Inattivi > 7 giorni)
  // =====================================================
  async sendNewsletterDormienti(
    email: string,
    unsubscribeToken: string,
    data: {
      personalizedLeads: Array<{
        business_name: string
        city: string
        category: string
        score: number
      }>
      preferredCategories: string[]
      preferredCities: string[]
      leadsUnlockedByOthersInArea: number
      newLeadsMatchingPreferences: number
    }
  ): Promise<boolean> {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://trovami.pro'
    const unsubscribeUrl = `${appUrl}/api/newsletter/unsubscribe?token=${unsubscribeToken}`

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
        <div style="max-width: 600px; margin: 40px auto; background-color: white; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); overflow: hidden;">

          <!-- Header -->
          <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 30px; text-align: center;">
            <div style="font-size: 40px; margin-bottom: 10px;">🎯</div>
            <h1 style="color: white; margin: 0; font-size: 24px;">Ci sono ${data.newLeadsMatchingPreferences} nuovi lead perfetti per te!</h1>
          </div>

          <div style="padding: 30px;">
            <p style="color: #4a5568; line-height: 1.6; font-size: 16px;">
              Ci manchi! Mentre eri via, abbiamo trovato nuovi lead che corrispondono ai tuoi interessi.
            </p>

            <!-- FOMO Section -->
            <div style="background-color: #fef3c7; padding: 15px; border-radius: 8px; border-left: 4px solid #f59e0b; margin: 20px 0;">
              <p style="color: #92400e; margin: 0; font-size: 14px;">
                <strong>⚡ ${data.leadsUnlockedByOthersInArea} lead</strong> sono stati sbloccati da altri utenti ${data.preferredCities.length > 0 ? `nella zona di ${data.preferredCities[0]}` : 'questa settimana'}!
              </p>
            </div>

            <!-- Personalized Leads -->
            <div style="margin: 25px 0;">
              <h3 style="color: #1a202c; font-size: 16px; margin-bottom: 15px;">
                Lead consigliati per te ${data.preferredCategories.length > 0 ? `(${data.preferredCategories.slice(0, 2).join(', ')})` : ''}:
              </h3>
              ${data.personalizedLeads.slice(0, 4).map(lead => `
                <div style="background-color: #f7fafc; padding: 12px; border-radius: 8px; margin-bottom: 10px; border-left: 3px solid ${lead.score <= 40 ? '#e53e3e' : '#10b981'};">
                  <div style="font-weight: 600; color: #1a202c;">${lead.business_name}</div>
                  <div style="font-size: 13px; color: #718096;">${lead.category} - ${lead.city}</div>
                  <div style="font-size: 12px; color: ${lead.score <= 40 ? '#e53e3e' : '#718096'}; margin-top: 4px;">
                    Score: ${lead.score}/100 ${lead.score <= 40 ? '- Sito con molti problemi!' : ''}
                  </div>
                </div>
              `).join('')}
            </div>

            <!-- Tips Section -->
            <div style="background-color: #ede9fe; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="color: #5b21b6; margin: 0 0 15px 0; font-size: 16px;">💡 Consiglio della settimana:</h3>
              <p style="color: #4c1d95; margin: 0; font-size: 14px; line-height: 1.6;">
                Quando contatti un lead, inizia con un'analisi gratuita del loro sito.
                Mostra loro i problemi specifici che hai trovato - funziona meglio di una proposta generica!
              </p>
            </div>

            <div style="text-align: center; margin: 30px 0;">
              <a href="${appUrl}/dashboard"
                 style="background: linear-gradient(135deg, #10b981 0%, #059669 100%);
                        color: white;
                        text-decoration: none;
                        padding: 14px 28px;
                        border-radius: 8px;
                        font-weight: 600;
                        font-size: 16px;
                        display: inline-block;">
                Scopri i nuovi lead
              </a>
            </div>
          </div>

          <!-- Footer -->
          <div style="background-color: #f7fafc; padding: 20px; text-align: center; border-top: 1px solid #e2e8f0;">
            <p style="color: #a0aec0; margin: 0 0 10px 0; font-size: 12px;">
              © 2025 TrovaMi - Trova clienti potenziali con difetti tecnici
            </p>
            <p style="margin: 0;">
              <a href="${unsubscribeUrl}" style="color: #a0aec0; font-size: 11px; text-decoration: underline;">
                Non vuoi piu ricevere queste email? Clicca qui per disiscriverti
              </a>
            </p>
          </div>
        </div>
      </body>
      </html>
    `

    return this.sendEmail({
      to: email,
      subject: `🎯 Ci sono ${data.newLeadsMatchingPreferences} nuovi lead perfetti per te - TrovaMi`,
      html
    })
  }

  // =====================================================
  // TEMPLATE: Newsletter ATTIVI (Attivi ultimi 7 giorni)
  // =====================================================
  async sendNewsletterAttivi(
    email: string,
    unsubscribeToken: string,
    data: {
      weeklyStats: {
        leadsUnlocked: number
        leadsContacted: number
        dealsWon: number
        currentStreak: number
      }
      gamification: {
        level: number
        xpPoints: number
        nextAchievement?: {
          name: string
          progress: number
          target: number
        }
      }
      successStory?: {
        title: string
        summary: string
      }
      newFeatures?: Array<{
        title: string
        description: string
      }>
    }
  ): Promise<boolean> {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://trovami.pro'
    const unsubscribeUrl = `${appUrl}/api/newsletter/unsubscribe?token=${unsubscribeToken}`

    // Tip basato sul livello
    const levelTip = data.gamification.level >= 5
      ? 'Prova a segmentare i tuoi lead per score: quelli sotto 30 hanno piu problemi e sono piu facili da convertire!'
      : data.gamification.level >= 3
      ? 'Usa il CRM per tracciare i follow-up. I deal si chiudono spesso al secondo o terzo contatto!'
      : 'Concentrati su una categoria alla volta per diventare esperto e aumentare il tasso di conversione.'

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
        <div style="max-width: 600px; margin: 40px auto; background-color: white; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); overflow: hidden;">

          <!-- Header -->
          <div style="background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%); padding: 30px; text-align: center;">
            <div style="font-size: 40px; margin-bottom: 10px;">📊</div>
            <h1 style="color: white; margin: 0; font-size: 24px;">La tua settimana su TrovaMi</h1>
            ${data.weeklyStats.currentStreak > 0 ? `
              <p style="color: rgba(255,255,255,0.8); margin: 10px 0 0 0; font-size: 14px;">
                🔥 Streak di ${data.weeklyStats.currentStreak} giorni!
              </p>
            ` : ''}
          </div>

          <div style="padding: 30px;">

            <!-- Weekly Stats -->
            <table style="width: 100%; margin-bottom: 25px; border-collapse: collapse;">
              <tr>
                <td style="text-align: center; padding: 15px; width: 33%;">
                  <div style="font-size: 28px; font-weight: bold; color: #6366f1;">${data.weeklyStats.leadsUnlocked}</div>
                  <div style="font-size: 12px; color: #718096;">Lead sbloccati</div>
                </td>
                <td style="text-align: center; padding: 15px; width: 33%; border-left: 1px solid #e2e8f0; border-right: 1px solid #e2e8f0;">
                  <div style="font-size: 28px; font-weight: bold; color: #10b981;">${data.weeklyStats.leadsContacted}</div>
                  <div style="font-size: 12px; color: #718096;">Lead contattati</div>
                </td>
                <td style="text-align: center; padding: 15px; width: 33%;">
                  <div style="font-size: 28px; font-weight: bold; color: #f59e0b;">${data.weeklyStats.dealsWon}</div>
                  <div style="font-size: 12px; color: #718096;">Deal chiusi</div>
                </td>
              </tr>
            </table>

            <!-- Gamification Progress -->
            <div style="background-color: #f5f3ff; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                <span style="font-weight: 600; color: #5b21b6;">Livello ${data.gamification.level}</span>
                <span style="color: #7c3aed; font-size: 14px;">${data.gamification.xpPoints} XP</span>
              </div>
              ${data.gamification.nextAchievement ? `
                <div style="margin-top: 10px;">
                  <div style="font-size: 13px; color: #4c1d95; margin-bottom: 5px;">
                    Prossimo achievement: ${data.gamification.nextAchievement.name}
                  </div>
                  <div style="background-color: #ddd6fe; border-radius: 4px; height: 8px; overflow: hidden;">
                    <div style="background: linear-gradient(90deg, #8b5cf6, #7c3aed); height: 100%; width: ${Math.min((data.gamification.nextAchievement.progress / data.gamification.nextAchievement.target) * 100, 100)}%;"></div>
                  </div>
                  <div style="font-size: 11px; color: #7c3aed; margin-top: 3px;">
                    ${data.gamification.nextAchievement.progress}/${data.gamification.nextAchievement.target}
                  </div>
                </div>
              ` : ''}
            </div>

            ${data.successStory ? `
              <!-- Success Story -->
              <div style="background-color: #f0fdf4; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #10b981;">
                <h3 style="color: #166534; margin: 0 0 10px 0; font-size: 14px;">✨ Storia di successo</h3>
                <p style="color: #15803d; margin: 0; font-size: 14px; font-weight: 600;">${data.successStory.title}</p>
                <p style="color: #4a5568; margin: 10px 0 0 0; font-size: 13px; line-height: 1.5;">${data.successStory.summary}</p>
              </div>
            ` : ''}

            ${data.newFeatures && data.newFeatures.length > 0 ? `
              <!-- New Features -->
              <div style="margin: 25px 0;">
                <h3 style="color: #1a202c; font-size: 16px; margin-bottom: 15px;">🆕 Novita della settimana:</h3>
                ${data.newFeatures.map(feature => `
                  <div style="background-color: #f7fafc; padding: 12px; border-radius: 8px; margin-bottom: 10px;">
                    <div style="font-weight: 600; color: #1a202c; font-size: 14px;">${feature.title}</div>
                    <div style="font-size: 13px; color: #718096; margin-top: 4px;">${feature.description}</div>
                  </div>
                `).join('')}
              </div>
            ` : ''}

            <!-- Tips based on level -->
            <div style="background-color: #fef3c7; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="color: #92400e; margin: 0 0 10px 0; font-size: 14px;">💡 Consiglio Pro per Livello ${data.gamification.level}+:</h3>
              <p style="color: #78350f; margin: 0; font-size: 13px; line-height: 1.5;">
                ${levelTip}
              </p>
            </div>

            <div style="text-align: center; margin: 30px 0;">
              <a href="${appUrl}/dashboard"
                 style="background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%);
                        color: white;
                        text-decoration: none;
                        padding: 14px 28px;
                        border-radius: 8px;
                        font-weight: 600;
                        font-size: 16px;
                        display: inline-block;">
                Continua a crescere!
              </a>
            </div>
          </div>

          <!-- Footer -->
          <div style="background-color: #f7fafc; padding: 20px; text-align: center; border-top: 1px solid #e2e8f0;">
            <p style="color: #a0aec0; margin: 0 0 10px 0; font-size: 12px;">
              © 2025 TrovaMi - Trova clienti potenziali con difetti tecnici
            </p>
            <p style="margin: 0;">
              <a href="${unsubscribeUrl}" style="color: #a0aec0; font-size: 11px; text-decoration: underline;">
                Non vuoi piu ricevere queste email? Clicca qui per disiscriverti
              </a>
            </p>
          </div>
        </div>
      </body>
      </html>
    `

    return this.sendEmail({
      to: email,
      subject: '📊 La tua settimana su TrovaMi + novita',
      html
    })
  }

  // Test della connessione SMTP
  async testConnection(): Promise<boolean> {
    if (!this.transporter) {
      console.error('❌ SMTP non configurato')
      return false
    }

    try {
      await this.transporter.verify()
      console.log('✅ Connessione SMTP verificata')
      return true
    } catch (error) {
      console.error('❌ Errore verifica SMTP:', error)
      return false
    }
  }
}

export const smtpEmail = new SMTPEmailService()
export default smtpEmail
