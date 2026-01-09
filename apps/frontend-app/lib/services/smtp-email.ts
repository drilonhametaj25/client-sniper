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

  // =====================================================
  // WELCOME SEQUENCE TEMPLATES (6 Email)
  // =====================================================

  /**
   * Welcome Day 0 - Benvenuto iniziale
   */
  async sendWelcomeDay0(email: string, unsubscribeToken: string, userId: string): Promise<boolean> {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://trovami.pro'
    const unsubscribeUrl = `${appUrl}/api/newsletter/unsubscribe?token=${unsubscribeToken}`

    // Get sample leads for preview
    const { getSampleLeads, getCompetitionMetrics } = await import('./newsletter-personalization')
    const sampleLeads = await getSampleLeads(3)
    const metrics = await getCompetitionMetrics()

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
        <div style="max-width: 600px; margin: 40px auto; background-color: white; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); overflow: hidden;">

          <div style="background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%); padding: 40px 30px; text-align: center;">
            <div style="font-size: 50px; margin-bottom: 15px;">🎉</div>
            <h1 style="color: white; margin: 0; font-size: 26px;">Benvenuto in TrovaMi!</h1>
            <p style="color: rgba(255,255,255,0.9); margin: 15px 0 0 0; font-size: 16px;">
              Hai 5 crediti gratuiti da usare subito
            </p>
          </div>

          <div style="padding: 30px;">
            <p style="color: #4a5568; line-height: 1.6; font-size: 16px;">
              Ciao e benvenuto! 👋
            </p>
            <p style="color: #4a5568; line-height: 1.6; font-size: 16px;">
              TrovaMi ti aiuta a trovare aziende con siti web problematici - il target perfetto per agenzie digitali e freelancer come te!
            </p>

            <div style="background-color: #f0fdf4; padding: 20px; border-radius: 8px; margin: 25px 0; text-align: center;">
              <p style="color: #166534; margin: 0 0 5px 0; font-size: 14px;">I tuoi crediti gratuiti</p>
              <p style="color: #15803d; margin: 0; font-size: 48px; font-weight: bold;">5</p>
              <p style="color: #166534; margin: 5px 0 0 0; font-size: 14px;">Usa un credito per sbloccare i contatti di un lead</p>
            </div>

            <h3 style="color: #1a202c; font-size: 16px; margin: 25px 0 15px 0;">Ecco alcuni lead disponibili ora:</h3>
            ${sampleLeads.map(lead => `
              <div style="background-color: #f7fafc; padding: 12px; border-radius: 8px; margin-bottom: 10px; border-left: 3px solid ${lead.score <= 40 ? '#ef4444' : '#6366f1'};">
                <div style="font-weight: 600; color: #1a202c;">${lead.business_name}</div>
                <div style="font-size: 13px; color: #718096;">${lead.category} - ${lead.city}</div>
                <div style="font-size: 12px; color: ${lead.score <= 40 ? '#ef4444' : '#718096'}; margin-top: 4px;">
                  Score: ${lead.score}/100 ${lead.score <= 40 ? '🔥 Alto potenziale!' : ''}
                </div>
              </div>
            `).join('')}

            <div style="text-align: center; margin: 30px 0;">
              <a href="${appUrl}/dashboard"
                 style="background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%);
                        color: white;
                        text-decoration: none;
                        padding: 16px 32px;
                        border-radius: 8px;
                        font-weight: 600;
                        font-size: 16px;
                        display: inline-block;">
                Inizia a esplorare i lead
              </a>
            </div>

            <p style="color: #718096; font-size: 14px; text-align: center;">
              Domani ti manderemo una guida rapida per trovare il lead perfetto!
            </p>
          </div>

          <div style="background-color: #f7fafc; padding: 20px; text-align: center; border-top: 1px solid #e2e8f0;">
            <p style="color: #a0aec0; margin: 0 0 10px 0; font-size: 12px;">© 2025 TrovaMi</p>
            <a href="${unsubscribeUrl}" style="color: #a0aec0; font-size: 11px; text-decoration: underline;">Disiscriviti</a>
          </div>
        </div>
      </body>
      </html>
    `

    return this.sendEmail({
      to: email,
      subject: '🎉 Benvenuto in TrovaMi! Ecco i tuoi 5 crediti gratuiti',
      html
    })
  }

  /**
   * Welcome Day 1 - Quick Start Guide
   */
  async sendWelcomeDay1(email: string, unsubscribeToken: string, userId: string): Promise<boolean> {
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

          <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 30px; text-align: center;">
            <div style="font-size: 40px; margin-bottom: 10px;">⚡</div>
            <h1 style="color: white; margin: 0; font-size: 24px;">Trova il lead perfetto in 30 secondi</h1>
          </div>

          <div style="padding: 30px;">
            <p style="color: #4a5568; line-height: 1.6; font-size: 16px;">
              Ecco una guida veloce per iniziare:
            </p>

            <div style="margin: 25px 0;">
              <div style="display: flex; margin-bottom: 20px;">
                <div style="width: 40px; height: 40px; background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%); border-radius: 50%; color: white; font-weight: bold; font-size: 18px; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">1</div>
                <div style="margin-left: 15px;">
                  <div style="font-weight: 600; color: #1a202c;">Scegli la tua categoria</div>
                  <div style="color: #718096; font-size: 14px; margin-top: 4px;">Ristoranti, hotel, dentisti, avvocati... scegli il settore che conosci meglio</div>
                </div>
              </div>

              <div style="display: flex; margin-bottom: 20px;">
                <div style="width: 40px; height: 40px; background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%); border-radius: 50%; color: white; font-weight: bold; font-size: 18px; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">2</div>
                <div style="margin-left: 15px;">
                  <div style="font-weight: 600; color: #1a202c;">Guarda lo score</div>
                  <div style="color: #718096; font-size: 14px; margin-top: 4px;">Score basso = piu problemi = piu facile proporre i tuoi servizi!</div>
                </div>
              </div>

              <div style="display: flex;">
                <div style="width: 40px; height: 40px; background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%); border-radius: 50%; color: white; font-weight: bold; font-size: 18px; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">3</div>
                <div style="margin-left: 15px;">
                  <div style="font-weight: 600; color: #1a202c;">Sblocca e contatta</div>
                  <div style="color: #718096; font-size: 14px; margin-top: 4px;">Usa 1 credito per vedere telefono ed email, poi proponi un'analisi gratuita</div>
                </div>
              </div>
            </div>

            <div style="background-color: #fef3c7; padding: 15px; border-radius: 8px; border-left: 4px solid #f59e0b; margin: 25px 0;">
              <p style="color: #92400e; margin: 0; font-size: 14px;">
                <strong>💡 Pro tip:</strong> I lead con score sotto 30 hanno siti con molti problemi - sono i piu facili da convincere!
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
                Prova ora - hai ancora 5 crediti!
              </a>
            </div>
          </div>

          <div style="background-color: #f7fafc; padding: 20px; text-align: center; border-top: 1px solid #e2e8f0;">
            <p style="color: #a0aec0; margin: 0 0 10px 0; font-size: 12px;">© 2025 TrovaMi</p>
            <a href="${unsubscribeUrl}" style="color: #a0aec0; font-size: 11px; text-decoration: underline;">Disiscriviti</a>
          </div>
        </div>
      </body>
      </html>
    `

    return this.sendEmail({
      to: email,
      subject: '⚡ Come trovare il lead perfetto in 30 secondi',
      html
    })
  }

  /**
   * Welcome Day 3 - FOMO Stats
   */
  async sendWelcomeDay3(email: string, unsubscribeToken: string, userId: string): Promise<boolean> {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://trovami.pro'
    const unsubscribeUrl = `${appUrl}/api/newsletter/unsubscribe?token=${unsubscribeToken}`

    const { getCompetitionMetrics, getSampleLeads } = await import('./newsletter-personalization')
    const metrics = await getCompetitionMetrics()
    const sampleLeads = await getSampleLeads(3)

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
            <div style="font-size: 40px; margin-bottom: 10px;">🏃</div>
            <h1 style="color: white; margin: 0; font-size: 24px;">Altri ${metrics.usersActiveThisWeek} freelancer hanno gia iniziato!</h1>
          </div>

          <div style="padding: 30px;">
            <p style="color: #4a5568; line-height: 1.6; font-size: 16px;">
              Mentre aspetti, altri professionisti stanno gia contattando i lead...
            </p>

            <div style="background-color: #fef3c7; padding: 20px; border-radius: 8px; margin: 25px 0; text-align: center;">
              <div style="font-size: 36px; font-weight: bold; color: #d97706;">${metrics.unlockedByOthers}</div>
              <div style="color: #92400e; font-size: 14px;">lead sbloccati questa settimana</div>
            </div>

            <p style="color: #4a5568; line-height: 1.6; font-size: 16px;">
              I tuoi <strong>5 crediti gratuiti</strong> ti aspettano ancora. Non lasciarli scadere!
            </p>

            <h3 style="color: #1a202c; font-size: 16px; margin: 25px 0 15px 0;">Lead disponibili ora:</h3>
            ${sampleLeads.map(lead => `
              <div style="background-color: #f7fafc; padding: 12px; border-radius: 8px; margin-bottom: 10px;">
                <div style="font-weight: 600; color: #1a202c;">${lead.business_name}</div>
                <div style="font-size: 13px; color: #718096;">${lead.category} - ${lead.city}</div>
              </div>
            `).join('')}

            <div style="text-align: center; margin: 30px 0;">
              <a href="${appUrl}/dashboard"
                 style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
                        color: white;
                        text-decoration: none;
                        padding: 14px 28px;
                        border-radius: 8px;
                        font-weight: 600;
                        font-size: 16px;
                        display: inline-block;">
                Non restare indietro!
              </a>
            </div>
          </div>

          <div style="background-color: #f7fafc; padding: 20px; text-align: center; border-top: 1px solid #e2e8f0;">
            <p style="color: #a0aec0; margin: 0 0 10px 0; font-size: 12px;">© 2025 TrovaMi</p>
            <a href="${unsubscribeUrl}" style="color: #a0aec0; font-size: 11px; text-decoration: underline;">Disiscriviti</a>
          </div>
        </div>
      </body>
      </html>
    `

    return this.sendEmail({
      to: email,
      subject: `🏃 Altri ${metrics.usersActiveThisWeek} freelancer hanno gia iniziato!`,
      html
    })
  }

  /**
   * Welcome Day 5 - Case Study / Value
   */
  async sendWelcomeDay5(email: string, unsubscribeToken: string, userId: string): Promise<boolean> {
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

          <div style="background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%); padding: 30px; text-align: center;">
            <div style="font-size: 40px; margin-bottom: 10px;">💰</div>
            <h1 style="color: white; margin: 0; font-size: 24px;">Ecco cosa puoi fare con 1 solo lead</h1>
          </div>

          <div style="padding: 30px;">

            <div style="background-color: #f5f3ff; padding: 25px; border-radius: 12px; margin: 20px 0;">
              <h3 style="color: #5b21b6; margin: 0 0 15px 0; font-size: 18px;">📊 Case Study: Marco, Web Designer</h3>
              <p style="color: #4c1d95; margin: 0; font-size: 14px; line-height: 1.8;">
                Marco ha trovato un ristorante a Milano con score 25 (sito lento, no mobile, no SEO).
                <br><br>
                Ha offerto un'analisi gratuita via email. Il proprietario ha risposto in 24 ore.
                <br><br>
                Risultato: <strong style="color: #7c3aed; font-size: 18px;">contratto da €1.500</strong> per rifacimento sito.
              </p>
            </div>

            <div style="background-color: #f0fdf4; padding: 20px; border-radius: 8px; margin: 25px 0;">
              <h4 style="color: #166534; margin: 0 0 15px 0;">Il ROI dei tuoi crediti gratuiti:</h4>
              <table style="width: 100%;">
                <tr>
                  <td style="color: #4a5568; padding: 5px 0;">Crediti usati:</td>
                  <td style="color: #166534; font-weight: bold; text-align: right;">1 (gratis)</td>
                </tr>
                <tr>
                  <td style="color: #4a5568; padding: 5px 0;">Tempo investito:</td>
                  <td style="color: #166534; font-weight: bold; text-align: right;">~30 min</td>
                </tr>
                <tr>
                  <td style="color: #4a5568; padding: 5px 0;">Potenziale guadagno:</td>
                  <td style="color: #166534; font-weight: bold; text-align: right;">€500 - €5.000+</td>
                </tr>
              </table>
            </div>

            <p style="color: #4a5568; line-height: 1.6; font-size: 16px; text-align: center;">
              Tu hai ancora <strong style="color: #6366f1;">5 crediti gratuiti</strong>.<br>
              Bastano per trovare il tuo prossimo cliente.
            </p>

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
                Trova il tuo primo cliente
              </a>
            </div>
          </div>

          <div style="background-color: #f7fafc; padding: 20px; text-align: center; border-top: 1px solid #e2e8f0;">
            <p style="color: #a0aec0; margin: 0 0 10px 0; font-size: 12px;">© 2025 TrovaMi</p>
            <a href="${unsubscribeUrl}" style="color: #a0aec0; font-size: 11px; text-decoration: underline;">Disiscriviti</a>
          </div>
        </div>
      </body>
      </html>
    `

    return this.sendEmail({
      to: email,
      subject: '💰 Ecco cosa puoi fare con 1 solo lead (case study)',
      html
    })
  }

  /**
   * Welcome Day 7 - Urgency
   */
  async sendWelcomeDay7(email: string, unsubscribeToken: string, userId: string): Promise<boolean> {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://trovami.pro'
    const unsubscribeUrl = `${appUrl}/api/newsletter/unsubscribe?token=${unsubscribeToken}`

    const { getSampleLeads } = await import('./newsletter-personalization')
    const sampleLeads = await getSampleLeads(3)

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
            <div style="font-size: 40px; margin-bottom: 10px;">⏰</div>
            <h1 style="color: white; margin: 0; font-size: 24px;">I tuoi crediti ti aspettano!</h1>
          </div>

          <div style="padding: 30px;">
            <p style="color: #4a5568; line-height: 1.6; font-size: 16px;">
              E passata una settimana dal tuo iscrizione e non hai ancora usato i tuoi crediti gratuiti.
            </p>

            <div style="background-color: #fef2f2; padding: 20px; border-radius: 8px; margin: 25px 0; text-align: center; border: 2px solid #fecaca;">
              <p style="color: #991b1b; margin: 0 0 5px 0; font-size: 14px;">Crediti disponibili</p>
              <p style="color: #dc2626; margin: 0; font-size: 48px; font-weight: bold;">5</p>
              <p style="color: #991b1b; margin: 5px 0 0 0; font-size: 14px;">Non lasciarli inutilizzati!</p>
            </div>

            <h3 style="color: #1a202c; font-size: 16px; margin: 25px 0 15px 0;">I migliori lead di oggi:</h3>
            ${sampleLeads.map(lead => `
              <div style="background-color: #f7fafc; padding: 12px; border-radius: 8px; margin-bottom: 10px; border-left: 3px solid #ef4444;">
                <div style="font-weight: 600; color: #1a202c;">${lead.business_name}</div>
                <div style="font-size: 13px; color: #718096;">${lead.category} - ${lead.city}</div>
                <div style="font-size: 12px; color: #ef4444; margin-top: 4px;">
                  Score: ${lead.score}/100 - Sito con molti problemi!
                </div>
              </div>
            `).join('')}

            <div style="text-align: center; margin: 30px 0;">
              <a href="${appUrl}/dashboard"
                 style="background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
                        color: white;
                        text-decoration: none;
                        padding: 14px 28px;
                        border-radius: 8px;
                        font-weight: 600;
                        font-size: 16px;
                        display: inline-block;">
                Usa i tuoi crediti ora
              </a>
            </div>
          </div>

          <div style="background-color: #f7fafc; padding: 20px; text-align: center; border-top: 1px solid #e2e8f0;">
            <p style="color: #a0aec0; margin: 0 0 10px 0; font-size: 12px;">© 2025 TrovaMi</p>
            <a href="${unsubscribeUrl}" style="color: #a0aec0; font-size: 11px; text-decoration: underline;">Disiscriviti</a>
          </div>
        </div>
      </body>
      </html>
    `

    return this.sendEmail({
      to: email,
      subject: '⏰ I tuoi crediti ti aspettano - non lasciarli scadere!',
      html
    })
  }

  /**
   * Welcome Day 14 - Last Chance
   */
  async sendWelcomeDay14(email: string, unsubscribeToken: string, userId: string): Promise<boolean> {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://trovami.pro'
    const unsubscribeUrl = `${appUrl}/api/newsletter/unsubscribe?token=${unsubscribeToken}`

    const { getSampleLeads, getCompetitionMetrics } = await import('./newsletter-personalization')
    const sampleLeads = await getSampleLeads(4)
    const metrics = await getCompetitionMetrics()

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
        <div style="max-width: 600px; margin: 40px auto; background-color: white; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); overflow: hidden;">

          <div style="background: linear-gradient(135deg, #7c3aed 0%, #5b21b6 100%); padding: 30px; text-align: center;">
            <div style="font-size: 40px; margin-bottom: 10px;">🎯</div>
            <h1 style="color: white; margin: 0; font-size: 24px;">Ultima occasione: i migliori lead nella tua zona</h1>
          </div>

          <div style="padding: 30px;">
            <p style="color: #4a5568; line-height: 1.6; font-size: 16px;">
              Sono passate 2 settimane. In questo tempo, <strong style="color: #7c3aed;">${metrics.unlockedByOthers} lead</strong> sono stati sbloccati da altri professionisti.
            </p>

            <div style="background-color: #fef3c7; padding: 15px; border-radius: 8px; border-left: 4px solid #f59e0b; margin: 25px 0;">
              <p style="color: #92400e; margin: 0; font-size: 14px;">
                <strong>I tuoi 5 crediti gratuiti sono ancora disponibili</strong> - usali prima che sia troppo tardi!
              </p>
            </div>

            <h3 style="color: #1a202c; font-size: 16px; margin: 25px 0 15px 0;">I lead con piu problemi di oggi:</h3>
            ${sampleLeads.map(lead => `
              <div style="background-color: #f7fafc; padding: 12px; border-radius: 8px; margin-bottom: 10px; border-left: 3px solid ${lead.score <= 30 ? '#ef4444' : '#7c3aed'};">
                <div style="font-weight: 600; color: #1a202c;">${lead.business_name}</div>
                <div style="font-size: 13px; color: #718096;">${lead.category} - ${lead.city}</div>
                <div style="font-size: 12px; color: ${lead.score <= 30 ? '#ef4444' : '#7c3aed'}; margin-top: 4px;">
                  Score: ${lead.score}/100 ${lead.score <= 30 ? '🔥 Opportunita CALDA!' : ''}
                </div>
              </div>
            `).join('')}

            <div style="text-align: center; margin: 30px 0;">
              <a href="${appUrl}/dashboard"
                 style="background: linear-gradient(135deg, #7c3aed 0%, #5b21b6 100%);
                        color: white;
                        text-decoration: none;
                        padding: 16px 32px;
                        border-radius: 8px;
                        font-weight: 600;
                        font-size: 16px;
                        display: inline-block;">
                Sblocca il tuo primo lead ora
              </a>
            </div>

            <p style="color: #718096; font-size: 14px; text-align: center;">
              Dopo questa email, riceverai solo la newsletter settimanale.
            </p>
          </div>

          <div style="background-color: #f7fafc; padding: 20px; text-align: center; border-top: 1px solid #e2e8f0;">
            <p style="color: #a0aec0; margin: 0 0 10px 0; font-size: 12px;">© 2025 TrovaMi</p>
            <a href="${unsubscribeUrl}" style="color: #a0aec0; font-size: 11px; text-decoration: underline;">Disiscriviti</a>
          </div>
        </div>
      </body>
      </html>
    `

    return this.sendEmail({
      to: email,
      subject: '🎯 Ultima occasione: i migliori lead nella tua zona',
      html
    })
  }

  // =====================================================
  // RE-ENGAGEMENT SEQUENCE TEMPLATES (4 Email)
  // =====================================================

  /**
   * Re-engagement Day 3 - Soft Nudge
   */
  async sendReengagementSoft(email: string, unsubscribeToken: string, userId: string): Promise<boolean> {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://trovami.pro'
    const unsubscribeUrl = `${appUrl}/api/newsletter/unsubscribe?token=${unsubscribeToken}`

    const { getPersonalizedLeads, getUserPreferences } = await import('./newsletter-personalization')
    const preferences = await getUserPreferences(userId)
    const { leads } = await getPersonalizedLeads(userId, preferences, 3)

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
            <h1 style="color: white; margin: 0; font-size: 24px;">Ci manchi! Ecco cosa ti sei perso</h1>
          </div>

          <div style="padding: 30px;">
            <p style="color: #4a5568; line-height: 1.6; font-size: 16px;">
              Non ti vediamo da qualche giorno! Nel frattempo, abbiamo trovato nuovi lead che potrebbero interessarti.
            </p>

            ${leads.length > 0 ? `
              <h3 style="color: #1a202c; font-size: 16px; margin: 25px 0 15px 0;">Nuovi lead per te:</h3>
              ${leads.map(lead => `
                <div style="background-color: #f7fafc; padding: 12px; border-radius: 8px; margin-bottom: 10px;">
                  <div style="font-weight: 600; color: #1a202c;">${lead.business_name}</div>
                  <div style="font-size: 13px; color: #718096;">${lead.category} - ${lead.city}</div>
                </div>
              `).join('')}
            ` : ''}

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
                Torna a esplorare
              </a>
            </div>
          </div>

          <div style="background-color: #f7fafc; padding: 20px; text-align: center; border-top: 1px solid #e2e8f0;">
            <p style="color: #a0aec0; margin: 0 0 10px 0; font-size: 12px;">© 2025 TrovaMi</p>
            <a href="${unsubscribeUrl}" style="color: #a0aec0; font-size: 11px; text-decoration: underline;">Disiscriviti</a>
          </div>
        </div>
      </body>
      </html>
    `

    return this.sendEmail({
      to: email,
      subject: '👋 Ci manchi! Ecco cosa ti sei perso',
      html
    })
  }

  /**
   * Re-engagement Day 7 - FOMO
   */
  async sendReengagementFomo(email: string, unsubscribeToken: string, userId: string): Promise<boolean> {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://trovami.pro'
    const unsubscribeUrl = `${appUrl}/api/newsletter/unsubscribe?token=${unsubscribeToken}`

    const { getCompetitionMetrics, getUserPreferences } = await import('./newsletter-personalization')
    const metrics = await getCompetitionMetrics()
    const preferences = await getUserPreferences(userId)

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
            <h1 style="color: white; margin: 0; font-size: 24px;">${metrics.unlockedByOthers} lead sbloccati ${preferences.cities.length > 0 ? `nella zona di ${preferences.cities[0]}` : 'questa settimana'}!</h1>
          </div>

          <div style="padding: 30px;">
            <p style="color: #4a5568; line-height: 1.6; font-size: 16px;">
              Mentre eri via, altri professionisti hanno sbloccato <strong style="color: #d97706;">${metrics.unlockedByOthers} lead</strong>. Alcuni di questi potrebbero essere nella tua zona!
            </p>

            <div style="background-color: #fef3c7; padding: 20px; border-radius: 8px; margin: 25px 0; border-left: 4px solid #f59e0b;">
              <p style="color: #92400e; margin: 0; font-size: 14px;">
                <strong>Non lasciare che la competizione ti superi!</strong><br>
                I lead migliori vengono contattati per primi.
              </p>
            </div>

            <div style="text-align: center; margin: 30px 0;">
              <a href="${appUrl}/dashboard"
                 style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
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
            <p style="color: #a0aec0; margin: 0 0 10px 0; font-size: 12px;">© 2025 TrovaMi</p>
            <a href="${unsubscribeUrl}" style="color: #a0aec0; font-size: 11px; text-decoration: underline;">Disiscriviti</a>
          </div>
        </div>
      </body>
      </html>
    `

    return this.sendEmail({
      to: email,
      subject: `⚡ ${metrics.unlockedByOthers} lead sbloccati nella tua zona!`,
      html
    })
  }

  /**
   * Re-engagement Day 14 - Value Story
   */
  async sendReengagementValue(email: string, unsubscribeToken: string, userId: string): Promise<boolean> {
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

          <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 30px; text-align: center;">
            <div style="font-size: 40px; margin-bottom: 10px;">🏆</div>
            <h1 style="color: white; margin: 0; font-size: 24px;">Il tuo competitor ha appena chiuso un deal!</h1>
          </div>

          <div style="padding: 30px;">
            <div style="background-color: #f0fdf4; padding: 25px; border-radius: 12px; margin: 20px 0;">
              <h3 style="color: #166534; margin: 0 0 15px 0; font-size: 16px;">📈 Storia vera di questa settimana:</h3>
              <p style="color: #4a5568; margin: 0; font-size: 14px; line-height: 1.8;">
                "Ho contattato 5 ristoranti trovati su TrovaMi. 2 mi hanno risposto, 1 ha firmato un contratto per €2.000. Tutto in una settimana!"
                <br><br>
                <em style="color: #166534;">- Marco, Web Designer da Milano</em>
              </p>
            </div>

            <p style="color: #4a5568; line-height: 1.6; font-size: 16px;">
              Anche tu potresti essere al suo posto. I lead sono la, aspettano solo di essere contattati.
            </p>

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
                Trova il tuo prossimo cliente
              </a>
            </div>
          </div>

          <div style="background-color: #f7fafc; padding: 20px; text-align: center; border-top: 1px solid #e2e8f0;">
            <p style="color: #a0aec0; margin: 0 0 10px 0; font-size: 12px;">© 2025 TrovaMi</p>
            <a href="${unsubscribeUrl}" style="color: #a0aec0; font-size: 11px; text-decoration: underline;">Disiscriviti</a>
          </div>
        </div>
      </body>
      </html>
    `

    return this.sendEmail({
      to: email,
      subject: '🏆 Il tuo competitor ha appena chiuso un deal!',
      html
    })
  }

  /**
   * Re-engagement Day 30 - Win-back (NO PROMO)
   */
  async sendReengagementWinback(email: string, unsubscribeToken: string, userId: string): Promise<boolean> {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://trovami.pro'
    const unsubscribeUrl = `${appUrl}/api/newsletter/unsubscribe?token=${unsubscribeToken}`

    const { getSampleLeads, getCompetitionMetrics } = await import('./newsletter-personalization')
    const sampleLeads = await getSampleLeads(4)
    const metrics = await getCompetitionMetrics()

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
        <div style="max-width: 600px; margin: 40px auto; background-color: white; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); overflow: hidden;">

          <div style="background: linear-gradient(135deg, #7c3aed 0%, #5b21b6 100%); padding: 30px; text-align: center;">
            <div style="font-size: 40px; margin-bottom: 10px;">💎</div>
            <h1 style="color: white; margin: 0; font-size: 24px;">I migliori lead ti aspettano ancora</h1>
          </div>

          <div style="padding: 30px;">
            <p style="color: #4a5568; line-height: 1.6; font-size: 16px;">
              E passato un mese dall'ultima volta che ti abbiamo visto. Nel frattempo, <strong style="color: #7c3aed;">${metrics.unlockedByOthers * 4}</strong> lead sono stati sbloccati!
            </p>

            <div style="background-color: #f5f3ff; padding: 20px; border-radius: 8px; margin: 25px 0;">
              <h4 style="color: #5b21b6; margin: 0 0 15px 0;">✨ Cosa si sono persi chi non usa TrovaMi:</h4>
              <ul style="color: #4c1d95; margin: 0; padding-left: 20px; line-height: 1.8;">
                <li>Ristoranti senza Google Analytics</li>
                <li>Hotel con siti non mobile-friendly</li>
                <li>Dentisti senza SEO</li>
                <li>...e centinaia di altre opportunita!</li>
              </ul>
            </div>

            <h3 style="color: #1a202c; font-size: 16px; margin: 25px 0 15px 0;">I lead piu caldi di oggi:</h3>
            ${sampleLeads.map(lead => `
              <div style="background-color: #f7fafc; padding: 12px; border-radius: 8px; margin-bottom: 10px; border-left: 3px solid #7c3aed;">
                <div style="font-weight: 600; color: #1a202c;">${lead.business_name}</div>
                <div style="font-size: 13px; color: #718096;">${lead.category} - ${lead.city}</div>
                <div style="font-size: 12px; color: #7c3aed; margin-top: 4px;">
                  Score: ${lead.score}/100
                </div>
              </div>
            `).join('')}

            <div style="text-align: center; margin: 30px 0;">
              <a href="${appUrl}/dashboard"
                 style="background: linear-gradient(135deg, #7c3aed 0%, #5b21b6 100%);
                        color: white;
                        text-decoration: none;
                        padding: 16px 32px;
                        border-radius: 8px;
                        font-weight: 600;
                        font-size: 16px;
                        display: inline-block;">
                Torna a trovare clienti
              </a>
            </div>
          </div>

          <div style="background-color: #f7fafc; padding: 20px; text-align: center; border-top: 1px solid #e2e8f0;">
            <p style="color: #a0aec0; margin: 0 0 10px 0; font-size: 12px;">© 2025 TrovaMi</p>
            <a href="${unsubscribeUrl}" style="color: #a0aec0; font-size: 11px; text-decoration: underline;">Disiscriviti</a>
          </div>
        </div>
      </body>
      </html>
    `

    return this.sendEmail({
      to: email,
      subject: '💎 I migliori lead ti aspettano ancora',
      html
    })
  }

  // =====================================================
  // POST-ACTION & ACHIEVEMENT TEMPLATES
  // =====================================================

  /**
   * First Unlock - Congratulazioni primo lead
   */
  async sendFirstUnlock(email: string, unsubscribeToken: string, leadName: string): Promise<boolean> {
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

          <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 40px 30px; text-align: center;">
            <div style="font-size: 50px; margin-bottom: 15px;">🎉</div>
            <h1 style="color: white; margin: 0; font-size: 26px;">Ottimo! Hai sbloccato il tuo primo lead!</h1>
          </div>

          <div style="padding: 30px;">
            <p style="color: #4a5568; line-height: 1.6; font-size: 16px;">
              Complimenti! Hai appena sbloccato <strong>${leadName}</strong>. Ora e il momento di contattarlo!
            </p>

            <div style="background-color: #f0fdf4; padding: 20px; border-radius: 8px; margin: 25px 0;">
              <h3 style="color: #166534; margin: 0 0 15px 0; font-size: 16px;">💡 Template email per il primo contatto:</h3>
              <div style="background: white; padding: 15px; border-radius: 8px; border: 1px solid #d1fae5;">
                <p style="color: #4a5568; margin: 0; font-size: 14px; line-height: 1.6; font-style: italic;">
                  "Buongiorno,<br><br>
                  Ho notato che il vostro sito web ha alcuni problemi tecnici che potrebbero penalizzarvi su Google (velocita, mobile, SEO).<br><br>
                  Mi occupo di [web design/marketing digitale] e sarei felice di farvi un'analisi gratuita.<br><br>
                  Posso chiamarvi questa settimana per un breve confronto?"
                </p>
              </div>
            </div>

            <div style="background-color: #fef3c7; padding: 15px; border-radius: 8px; border-left: 4px solid #f59e0b;">
              <p style="color: #92400e; margin: 0; font-size: 14px;">
                <strong>Pro tip:</strong> Contatta entro 24 ore per massimizzare le chance di risposta!
              </p>
            </div>

            <div style="text-align: center; margin: 30px 0;">
              <a href="${appUrl}/crm"
                 style="background: linear-gradient(135deg, #10b981 0%, #059669 100%);
                        color: white;
                        text-decoration: none;
                        padding: 14px 28px;
                        border-radius: 8px;
                        font-weight: 600;
                        font-size: 16px;
                        display: inline-block;">
                Vai al CRM per gestire il lead
              </a>
            </div>
          </div>

          <div style="background-color: #f7fafc; padding: 20px; text-align: center; border-top: 1px solid #e2e8f0;">
            <p style="color: #a0aec0; margin: 0 0 10px 0; font-size: 12px;">© 2025 TrovaMi</p>
            <a href="${unsubscribeUrl}" style="color: #a0aec0; font-size: 11px; text-decoration: underline;">Disiscriviti</a>
          </div>
        </div>
      </body>
      </html>
    `

    return this.sendEmail({
      to: email,
      subject: '🎉 Ottimo! Hai sbloccato il tuo primo lead!',
      html
    })
  }

  /**
   * First Contact - Congratulazioni primo contatto
   */
  async sendFirstContact(email: string, unsubscribeToken: string): Promise<boolean> {
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

          <div style="background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%); padding: 30px; text-align: center;">
            <div style="font-size: 40px; margin-bottom: 10px;">🚀</div>
            <h1 style="color: white; margin: 0; font-size: 24px;">Stai andando alla grande!</h1>
          </div>

          <div style="padding: 30px;">
            <p style="color: #4a5568; line-height: 1.6; font-size: 16px;">
              Hai contattato il tuo primo lead! Questo e il passo piu importante.
            </p>

            <div style="background-color: #ede9fe; padding: 20px; border-radius: 8px; margin: 25px 0;">
              <h3 style="color: #5b21b6; margin: 0 0 15px 0; font-size: 16px;">📞 Ecco il prossimo step:</h3>
              <ol style="color: #4c1d95; margin: 0; padding-left: 20px; line-height: 1.8;">
                <li>Se non rispondono entro 2-3 giorni, manda un follow-up</li>
                <li>Proponi sempre un'analisi gratuita come primo step</li>
                <li>Usa il CRM per tracciare tutti i tuoi contatti</li>
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
                Continua a trovare lead
              </a>
            </div>
          </div>

          <div style="background-color: #f7fafc; padding: 20px; text-align: center; border-top: 1px solid #e2e8f0;">
            <p style="color: #a0aec0; margin: 0 0 10px 0; font-size: 12px;">© 2025 TrovaMi</p>
            <a href="${unsubscribeUrl}" style="color: #a0aec0; font-size: 11px; text-decoration: underline;">Disiscriviti</a>
          </div>
        </div>
      </body>
      </html>
    `

    return this.sendEmail({
      to: email,
      subject: '🚀 Stai andando alla grande! Ecco il prossimo step',
      html
    })
  }

  /**
   * First Deal - Celebrazione primo deal
   */
  async sendFirstDeal(email: string, unsubscribeToken: string, dealValue?: number): Promise<boolean> {
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

          <div style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); padding: 40px 30px; text-align: center;">
            <div style="font-size: 60px; margin-bottom: 15px;">🏆</div>
            <h1 style="color: white; margin: 0; font-size: 28px;">HAI CHIUSO IL TUO PRIMO DEAL!</h1>
            ${dealValue ? `<p style="color: rgba(255,255,255,0.9); margin: 15px 0 0 0; font-size: 24px; font-weight: bold;">€${dealValue.toLocaleString()}</p>` : ''}
          </div>

          <div style="padding: 30px; text-align: center;">
            <p style="color: #4a5568; line-height: 1.6; font-size: 18px;">
              Congratulazioni! 🎉 Questo e solo l'inizio!
            </p>

            <div style="background-color: #fef3c7; padding: 20px; border-radius: 8px; margin: 25px 0;">
              <p style="color: #92400e; margin: 0; font-size: 16px;">
                <strong>+100 XP guadagnati!</strong><br>
                <span style="font-size: 14px;">Hai sbloccato il badge "Primo Deal"</span>
              </p>
            </div>

            <p style="color: #4a5568; line-height: 1.6; font-size: 16px;">
              Ora che sai come funziona, continua a espandere il tuo portafoglio clienti!
            </p>

            <div style="text-align: center; margin: 30px 0;">
              <a href="${appUrl}/dashboard"
                 style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
                        color: white;
                        text-decoration: none;
                        padding: 16px 32px;
                        border-radius: 8px;
                        font-weight: 600;
                        font-size: 16px;
                        display: inline-block;">
                Trova il prossimo cliente!
              </a>
            </div>
          </div>

          <div style="background-color: #f7fafc; padding: 20px; text-align: center; border-top: 1px solid #e2e8f0;">
            <p style="color: #a0aec0; margin: 0 0 10px 0; font-size: 12px;">© 2025 TrovaMi</p>
            <a href="${unsubscribeUrl}" style="color: #a0aec0; font-size: 11px; text-decoration: underline;">Disiscriviti</a>
          </div>
        </div>
      </body>
      </html>
    `

    return this.sendEmail({
      to: email,
      subject: '🏆 HAI CHIUSO IL TUO PRIMO DEAL! Congratulazioni!',
      html
    })
  }

  /**
   * Milestone 5 Leads
   */
  async sendMilestone5Leads(email: string, unsubscribeToken: string): Promise<boolean> {
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

          <div style="background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%); padding: 30px; text-align: center;">
            <div style="font-size: 50px; margin-bottom: 10px;">⭐</div>
            <h1 style="color: white; margin: 0; font-size: 24px;">5 lead sbloccati! Stai diventando un pro!</h1>
          </div>

          <div style="padding: 30px; text-align: center;">
            <p style="color: #4a5568; line-height: 1.6; font-size: 16px;">
              Hai raggiunto un traguardo importante!
            </p>

            <div style="background-color: #f5f3ff; padding: 20px; border-radius: 8px; margin: 25px 0;">
              <p style="color: #5b21b6; margin: 0; font-size: 16px;">
                <strong>+50 XP guadagnati!</strong><br>
                <span style="font-size: 14px;">Badge "Esploratore" sbloccato</span>
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
                Continua cosi!
              </a>
            </div>
          </div>

          <div style="background-color: #f7fafc; padding: 20px; text-align: center; border-top: 1px solid #e2e8f0;">
            <p style="color: #a0aec0; margin: 0 0 10px 0; font-size: 12px;">© 2025 TrovaMi</p>
            <a href="${unsubscribeUrl}" style="color: #a0aec0; font-size: 11px; text-decoration: underline;">Disiscriviti</a>
          </div>
        </div>
      </body>
      </html>
    `

    return this.sendEmail({
      to: email,
      subject: '⭐ 5 lead sbloccati! Stai diventando un pro!',
      html
    })
  }

  /**
   * Milestone 10 Leads - Power User
   */
  async sendMilestone10Leads(email: string, unsubscribeToken: string): Promise<boolean> {
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

          <div style="background: linear-gradient(135deg, #ec4899 0%, #be185d 100%); padding: 30px; text-align: center;">
            <div style="font-size: 50px; margin-bottom: 10px;">🔥</div>
            <h1 style="color: white; margin: 0; font-size: 24px;">10 lead! Sei ufficialmente un Power User!</h1>
          </div>

          <div style="padding: 30px; text-align: center;">
            <p style="color: #4a5568; line-height: 1.6; font-size: 16px;">
              Sei nel top 10% degli utenti TrovaMi! Impressionante!
            </p>

            <div style="background-color: #fdf2f8; padding: 20px; border-radius: 8px; margin: 25px 0;">
              <p style="color: #be185d; margin: 0; font-size: 16px;">
                <strong>+100 XP guadagnati!</strong><br>
                <span style="font-size: 14px;">Badge "Power User" sbloccato</span>
              </p>
            </div>

            <div style="text-align: center; margin: 30px 0;">
              <a href="${appUrl}/dashboard"
                 style="background: linear-gradient(135deg, #ec4899 0%, #be185d 100%);
                        color: white;
                        text-decoration: none;
                        padding: 14px 28px;
                        border-radius: 8px;
                        font-weight: 600;
                        font-size: 16px;
                        display: inline-block;">
                Continua a dominare!
              </a>
            </div>
          </div>

          <div style="background-color: #f7fafc; padding: 20px; text-align: center; border-top: 1px solid #e2e8f0;">
            <p style="color: #a0aec0; margin: 0 0 10px 0; font-size: 12px;">© 2025 TrovaMi</p>
            <a href="${unsubscribeUrl}" style="color: #a0aec0; font-size: 11px; text-decoration: underline;">Disiscriviti</a>
          </div>
        </div>
      </body>
      </html>
    `

    return this.sendEmail({
      to: email,
      subject: '🔥 10 lead! Sei ufficialmente un Power User!',
      html
    })
  }

  /**
   * Streak Celebration (7, 14, 30 days)
   */
  async sendStreakCelebration(email: string, unsubscribeToken: string, streakDays: number): Promise<boolean> {
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

          <div style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); padding: 30px; text-align: center;">
            <div style="font-size: 50px; margin-bottom: 10px;">🔥</div>
            <h1 style="color: white; margin: 0; font-size: 24px;">${streakDays} giorni di streak! Keep it up!</h1>
          </div>

          <div style="padding: 30px; text-align: center;">
            <p style="color: #4a5568; line-height: 1.6; font-size: 16px;">
              Sei attivo da <strong>${streakDays} giorni consecutivi</strong>! La costanza paga sempre.
            </p>

            <div style="background-color: #fef3c7; padding: 20px; border-radius: 8px; margin: 25px 0;">
              <p style="color: #92400e; margin: 0; font-size: 16px;">
                <strong>+${streakDays * 5} XP bonus streak!</strong>
              </p>
            </div>

            <div style="text-align: center; margin: 30px 0;">
              <a href="${appUrl}/dashboard"
                 style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
                        color: white;
                        text-decoration: none;
                        padding: 14px 28px;
                        border-radius: 8px;
                        font-weight: 600;
                        font-size: 16px;
                        display: inline-block;">
                Continua la streak!
              </a>
            </div>
          </div>

          <div style="background-color: #f7fafc; padding: 20px; text-align: center; border-top: 1px solid #e2e8f0;">
            <p style="color: #a0aec0; margin: 0 0 10px 0; font-size: 12px;">© 2025 TrovaMi</p>
            <a href="${unsubscribeUrl}" style="color: #a0aec0; font-size: 11px; text-decoration: underline;">Disiscriviti</a>
          </div>
        </div>
      </body>
      </html>
    `

    return this.sendEmail({
      to: email,
      subject: `🔥 ${streakDays} giorni di streak! Keep it up!`,
      html
    })
  }

  /**
   * Level Up
   */
  async sendLevelUp(email: string, unsubscribeToken: string, newLevel: number): Promise<boolean> {
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

          <div style="background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%); padding: 40px 30px; text-align: center;">
            <div style="font-size: 60px; margin-bottom: 15px;">⬆️</div>
            <h1 style="color: white; margin: 0; font-size: 28px;">Sei salito al Livello ${newLevel}!</h1>
          </div>

          <div style="padding: 30px; text-align: center;">
            <p style="color: #4a5568; line-height: 1.6; font-size: 18px;">
              Congratulazioni! Stai crescendo! 🚀
            </p>

            <div style="background-color: #f5f3ff; padding: 20px; border-radius: 8px; margin: 25px 0;">
              <p style="color: #5b21b6; margin: 0; font-size: 16px;">
                <strong>Nuovi poteri sbloccati a livello ${newLevel}!</strong>
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
                Scopri le novita!
              </a>
            </div>
          </div>

          <div style="background-color: #f7fafc; padding: 20px; text-align: center; border-top: 1px solid #e2e8f0;">
            <p style="color: #a0aec0; margin: 0 0 10px 0; font-size: 12px;">© 2025 TrovaMi</p>
            <a href="${unsubscribeUrl}" style="color: #a0aec0; font-size: 11px; text-decoration: underline;">Disiscriviti</a>
          </div>
        </div>
      </body>
      </html>
    `

    return this.sendEmail({
      to: email,
      subject: `⬆️ Sei salito al Livello ${newLevel}! Nuovi poteri sbloccati!`,
      html
    })
  }

  /**
   * Deal Won Celebration
   */
  async sendDealWonCelebration(email: string, unsubscribeToken: string, dealValue: number, totalDeals: number): Promise<boolean> {
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

          <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 40px 30px; text-align: center;">
            <div style="font-size: 60px; margin-bottom: 15px;">💰</div>
            <h1 style="color: white; margin: 0; font-size: 28px;">Nuovo deal chiuso!</h1>
            <p style="color: rgba(255,255,255,0.9); margin: 15px 0 0 0; font-size: 24px; font-weight: bold;">€${dealValue.toLocaleString()}</p>
          </div>

          <div style="padding: 30px; text-align: center;">
            <p style="color: #4a5568; line-height: 1.6; font-size: 16px;">
              Questo e il tuo deal numero <strong>#${totalDeals}</strong>! Sei una macchina! 💪
            </p>

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
                Trova il prossimo cliente!
              </a>
            </div>
          </div>

          <div style="background-color: #f7fafc; padding: 20px; text-align: center; border-top: 1px solid #e2e8f0;">
            <p style="color: #a0aec0; margin: 0 0 10px 0; font-size: 12px;">© 2025 TrovaMi</p>
            <a href="${unsubscribeUrl}" style="color: #a0aec0; font-size: 11px; text-decoration: underline;">Disiscriviti</a>
          </div>
        </div>
      </body>
      </html>
    `

    return this.sendEmail({
      to: email,
      subject: `💰 Nuovo deal da €${dealValue.toLocaleString()}! Congratulazioni!`,
      html
    })
  }

  /**
   * Elite Status - Top 10%
   */
  async sendEliteStatus(email: string, unsubscribeToken: string): Promise<boolean> {
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

          <div style="background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%); padding: 40px 30px; text-align: center;">
            <div style="font-size: 60px; margin-bottom: 15px;">👑</div>
            <h1 style="color: white; margin: 0; font-size: 28px;">Sei nel TOP 10% degli utenti TrovaMi!</h1>
          </div>

          <div style="padding: 30px; text-align: center;">
            <p style="color: #4a5568; line-height: 1.6; font-size: 18px;">
              Wow! Sei ufficialmente un utente ELITE! 🏆
            </p>

            <div style="background-color: #fef3c7; padding: 20px; border-radius: 8px; margin: 25px 0;">
              <p style="color: #92400e; margin: 0; font-size: 16px;">
                <strong>Badge "Elite" sbloccato!</strong><br>
                <span style="font-size: 14px;">Continua cosi per mantenere il tuo status</span>
              </p>
            </div>

            <div style="text-align: center; margin: 30px 0;">
              <a href="${appUrl}/dashboard"
                 style="background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%);
                        color: white;
                        text-decoration: none;
                        padding: 14px 28px;
                        border-radius: 8px;
                        font-weight: 600;
                        font-size: 16px;
                        display: inline-block;">
                Continua a dominare!
              </a>
            </div>
          </div>

          <div style="background-color: #f7fafc; padding: 20px; text-align: center; border-top: 1px solid #e2e8f0;">
            <p style="color: #a0aec0; margin: 0 0 10px 0; font-size: 12px;">© 2025 TrovaMi</p>
            <a href="${unsubscribeUrl}" style="color: #a0aec0; font-size: 11px; text-decoration: underline;">Disiscriviti</a>
          </div>
        </div>
      </body>
      </html>
    `

    return this.sendEmail({
      to: email,
      subject: '👑 Sei nel TOP 10% degli utenti TrovaMi!',
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
