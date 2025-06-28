/**
 * Servizio email per TrovaMi
 * Usato per: Inviare email personalizzate di conferma, benvenuto, notifiche
 * Chiamato da: API di registrazione, webhook, sistemi di notifica
 */

interface EmailTemplate {
  subject: string
  html: string
  text: string
}

interface SendEmailParams {
  to: string
  template: EmailTemplate
  variables?: Record<string, string>
}

export class EmailService {
  private static instance: EmailService
  private resendApiKey: string

  constructor() {
    this.resendApiKey = process.env.RESEND_API_KEY || ''
  }

  static getInstance(): EmailService {
    if (!EmailService.instance) {
      EmailService.instance = new EmailService()
    }
    return EmailService.instance
  }

  // Template email di conferma account
  static getConfirmationEmailTemplate(confirmationUrl: string, userEmail: string): EmailTemplate {
    return {
      subject: '✨ Conferma il tuo account TrovaMi',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Conferma Account TrovaMi</title>
        </head>
        <body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
          <div style="max-width: 600px; margin: 0 auto; background-color: white; border-radius: 8px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); overflow: hidden; margin-top: 40px;">
            
            <!-- Header -->
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 30px; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 700;">
                🎯 TrovaMi
              </h1>
              <p style="color: rgba(255, 255, 255, 0.9); margin: 10px 0 0 0; font-size: 16px;">
                Trova clienti potenziali con difetti tecnici
              </p>
            </div>

            <!-- Content -->
            <div style="padding: 40px 30px;">
              <h2 style="color: #1a202c; margin: 0 0 20px 0; font-size: 24px; font-weight: 600;">
                Benvenuto in TrovaMi! 🚀
              </h2>
              
              <p style="color: #4a5568; line-height: 1.6; margin: 0 0 20px 0; font-size: 16px;">
                Ciao! Grazie per esserti registrato a <strong>TrovaMi</strong>, la piattaforma che ti aiuta a trovare clienti potenziali analizzando siti web con difetti tecnici.
              </p>
              
              <p style="color: #4a5568; line-height: 1.6; margin: 0 0 30px 0; font-size: 16px;">
                Per completare la registrazione e accedere al tuo account gratuito, clicca sul pulsante qui sotto:
              </p>

              <!-- CTA Button -->
              <div style="text-align: center; margin: 30px 0;">
                <a href="${confirmationUrl}" 
                   style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                          color: white; 
                          text-decoration: none; 
                          padding: 16px 32px; 
                          border-radius: 8px; 
                          font-weight: 600; 
                          font-size: 16px; 
                          display: inline-block;
                          box-shadow: 0 4px 14px rgba(102, 126, 234, 0.3);">
                  ✅ Conferma Account
                </a>
              </div>

              <!-- Benefits -->
              <div style="background-color: #f7fafc; padding: 25px; border-radius: 8px; margin: 30px 0;">
                <h3 style="color: #2d3748; margin: 0 0 15px 0; font-size: 18px; font-weight: 600;">
                  🎁 Cosa ottieni con il piano gratuito:
                </h3>
                <ul style="color: #4a5568; margin: 0; padding-left: 20px; line-height: 1.8;">
                  <li><strong>2 lead gratuiti</strong> per iniziare</li>
                  <li><strong>Analisi tecnica completa</strong> dei siti web</li>
                  <li><strong>Punteggio di priorità</strong> per ogni lead</li>
                  <li><strong>Dashboard intuitiva</strong> per gestire i contatti</li>
                </ul>
              </div>

              <p style="color: #718096; line-height: 1.6; margin: 20px 0 0 0; font-size: 14px;">
                Se il pulsante non funziona, copia e incolla questo link nel tuo browser:<br>
                <a href="${confirmationUrl}" style="color: #667eea; word-break: break-all;">${confirmationUrl}</a>
              </p>
            </div>

            <!-- Footer -->
            <div style="background-color: #f7fafc; padding: 25px 30px; text-align: center; border-top: 1px solid #e2e8f0;">
              <p style="color: #718096; margin: 0; font-size: 14px;">
                Hai domande? Rispondi a questa email, siamo qui per aiutarti! 💬
              </p>
              <p style="color: #a0aec0; margin: 10px 0 0 0; font-size: 12px;">
                © 2025 TrovaMi. Tutti i diritti riservati.
              </p>
            </div>
          </div>

          <!-- Mobile optimization -->
          <style>
            @media only screen and (max-width: 600px) {
              .container { margin: 10px !important; }
              .content { padding: 20px !important; }
              .header { padding: 30px 20px !important; }
            }
          </style>
        </body>
        </html>
      `,
      text: `
Benvenuto in TrovaMi! 🎯

Grazie per esserti registrato alla piattaforma che ti aiuta a trovare clienti potenziali analizzando siti web con difetti tecnici.

Per completare la registrazione, clicca qui: ${confirmationUrl}

Cosa ottieni con il piano gratuito:
• 2 lead gratuiti per iniziare
• Analisi tecnica completa dei siti web  
• Punteggio di priorità per ogni lead
• Dashboard intuitiva per gestire i contatti

Hai domande? Rispondi a questa email!

© 2025 TrovaMi
      `
    }
  }

  // Template email di benvenuto post-conferma
  static getWelcomeEmailTemplate(userEmail: string, dashboardUrl: string): EmailTemplate {
    return {
      subject: '🎉 Account confermato! I tuoi 2 lead gratuiti ti aspettano',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Benvenuto in TrovaMi</title>
        </head>
        <body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
          <div style="max-width: 600px; margin: 0 auto; background-color: white; border-radius: 8px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); overflow: hidden; margin-top: 40px;">
            
            <!-- Header con confetti -->
            <div style="background: linear-gradient(135deg, #48bb78 0%, #38a169 100%); padding: 40px 30px; text-align: center; position: relative;">
              <div style="font-size: 40px; margin-bottom: 10px;">🎉</div>
              <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 700;">
                Account Confermato!
              </h1>
              <p style="color: rgba(255, 255, 255, 0.9); margin: 10px 0 0 0; font-size: 16px;">
                Benvenuto ufficialmente in TrovaMi! 🚀
              </p>
            </div>

            <!-- Content -->
            <div style="padding: 40px 30px;">
              <p style="color: #4a5568; line-height: 1.6; margin: 0 0 25px 0; font-size: 16px;">
                Fantastico! Il tuo account è stato confermato con successo. Ora puoi accedere alla dashboard e iniziare a scoprire lead di qualità.
              </p>

              <!-- CTA per Dashboard -->
              <div style="text-align: center; margin: 30px 0;">
                <a href="${dashboardUrl}" 
                   style="background: linear-gradient(135deg, #48bb78 0%, #38a169 100%); 
                          color: white; 
                          text-decoration: none; 
                          padding: 16px 32px; 
                          border-radius: 8px; 
                          font-weight: 600; 
                          font-size: 16px; 
                          display: inline-block;
                          box-shadow: 0 4px 14px rgba(72, 187, 120, 0.3);">
                  🎯 Vai alla Dashboard
                </a>
              </div>

              <!-- Quick Start Guide -->
              <div style="background-color: #f0fff4; border-left: 4px solid #48bb78; padding: 25px; margin: 30px 0;">
                <h3 style="color: #2d3748; margin: 0 0 15px 0; font-size: 18px; font-weight: 600;">
                  🚀 Come iniziare subito:
                </h3>
                <ol style="color: #4a5568; margin: 0; padding-left: 20px; line-height: 1.8;">
                  <li>Accedi alla dashboard</li>
                  <li>Esplora i tuoi <strong>2 lead gratuiti</strong></li>
                  <li>Studia l'analisi tecnica di ogni sito</li>
                  <li>Contatta i clienti potenziali più promettenti</li>
                </ol>
              </div>

              <p style="color: #4a5568; line-height: 1.6; margin: 20px 0; font-size: 16px;">
                Ricorda: ogni lead ha un <strong>punteggio di priorità</strong> che indica quanto il sito ha bisogno di miglioramenti. Più è basso, maggiori sono le opportunità! 📈
              </p>
            </div>

            <!-- Footer -->
            <div style="background-color: #f7fafc; padding: 25px 30px; text-align: center;">
              <p style="color: #718096; margin: 0 0 10px 0; font-size: 14px;">
                Hai bisogno di aiuto? Rispondi a questa email! 💬
              </p>
              <p style="color: #a0aec0; margin: 0; font-size: 12px;">
                © 2025 TrovaMi
              </p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `
🎉 Account Confermato!

Fantastico! Il tuo account TrovaMi è stato confermato con successo.

Accedi alla dashboard: ${dashboardUrl}

Come iniziare subito:
1. Accedi alla dashboard
2. Esplora i tuoi 2 lead gratuiti
3. Studia l'analisi tecnica di ogni sito
4. Contatta i clienti potenziali più promettenti

Ricorda: ogni lead ha un punteggio di priorità che indica le opportunità di business!

Hai domande? Rispondi a questa email.

© 2025 TrovaMi
      `
    }
  }

  // Metodo per inviare email tramite Resend
  async sendEmail({ to, template, variables = {} }: SendEmailParams): Promise<boolean> {
    try {
      if (!this.resendApiKey) {
        console.error('RESEND_API_KEY non configurata')
        return false
      }

      // Sostituisci le variabili nel template
      let { html, text, subject } = template
      Object.entries(variables).forEach(([key, value]) => {
        const placeholder = `{{${key}}}`
        html = html.replace(new RegExp(placeholder, 'g'), value)
        text = text.replace(new RegExp(placeholder, 'g'), value)
        subject = subject.replace(new RegExp(placeholder, 'g'), value)
      })

      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.resendApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'TrovaMi <noreply@trovami.pro>',
          to: [to],
          subject,
          html,
          text,
        }),
      })

      if (!response.ok) {
        console.error('Errore invio email:', await response.text())
        return false
      }

      console.log('✅ Email inviata con successo a:', to)
      return true
    } catch (error) {
      console.error('Errore servizio email:', error)
      return false
    }
  }

  // Metodo convenienza per email di conferma
  async sendConfirmationEmail(userEmail: string, confirmationUrl: string): Promise<boolean> {
    const template = EmailService.getConfirmationEmailTemplate(confirmationUrl, userEmail)
    return this.sendEmail({ to: userEmail, template })
  }

  // Metodo convenienza per email di benvenuto
  async sendWelcomeEmail(userEmail: string, dashboardUrl: string): Promise<boolean> {
    const template = EmailService.getWelcomeEmailTemplate(userEmail, dashboardUrl)
    return this.sendEmail({ to: userEmail, template })
  }
}

export const emailService = EmailService.getInstance()
