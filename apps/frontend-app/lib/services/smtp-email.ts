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
