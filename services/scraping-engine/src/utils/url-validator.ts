/**
 * URL Validator - Validazione robusta URL con protezioni SSRF e blacklist
 * Utilizzato da: manual-scan API, scraping engine, analyzers
 * Previene: SSRF attacks, accesso a reti interne, URL malformati
 */

import { URL } from 'url';
import dns from 'dns';
import { promisify } from 'util';

const dnsLookup = promisify(dns.lookup);

interface ValidationResult {
  valid: boolean;
  error?: string;
  normalizedUrl?: string;
}

export class URLValidator {
  private blacklistedHosts = [
    // Localhost variants
    'localhost',
    '127.0.0.1',
    '0.0.0.0',
    '::1',
    
    // Private networks (RFC 1918)
    '10.',
    '172.16.',
    '172.17.',
    '172.18.',
    '172.19.',
    '172.20.',
    '172.21.',
    '172.22.',
    '172.23.',
    '172.24.',
    '172.25.',
    '172.26.',
    '172.27.',
    '172.28.',
    '172.29.',
    '172.30.',
    '172.31.',
    '192.168.',
    
    // Link-local
    '169.254.',
    
    // Multicast
    '224.',
    '225.',
    '226.',
    '227.',
    '228.',
    '229.',
    '230.',
    '231.',
    '232.',
    '233.',
    '234.',
    '235.',
    '236.',
    '237.',
    '238.',
    '239.',
    
    // Test domains
    'test.',
    'example.com',
    'example.org',
    'example.net'
  ];

  private blacklistedTlds = [
    '.test',
    '.localhost',
    '.local',
    '.internal',
    '.private'
  ];

  private logger = {
    info: (...args: any[]) => console.info('[URLValidator]', ...args),
    warn: (...args: any[]) => console.warn('[URLValidator]', ...args),
    error: (...args: any[]) => console.error('[URLValidator]', ...args)
  };

  /**
   * Valida e normalizza un URL
   */
  async validate(input: string): Promise<ValidationResult> {
    try {
      // 1. Pulizia input base
      const cleaned = this.cleanInput(input);
      if (!cleaned) {
        return { valid: false, error: 'URL vuoto o non valido' };
      }

      // 2. Validazione formato base
      let urlObj: URL;
      try {
        urlObj = new URL(cleaned);
      } catch (error) {
        return { valid: false, error: 'Formato URL non valido' };
      }

      // 3. Validazione protocollo
      if (!['http:', 'https:'].includes(urlObj.protocol)) {
        return { valid: false, error: 'Protocollo non supportato. Usa http:// o https://' };
      }

      // 4. Validazione hostname
      const hostnameCheck = this.validateHostname(urlObj.hostname);
      if (!hostnameCheck.valid) {
        return hostnameCheck;
      }

      // 5. Validazione TLD
      const tldCheck = this.validateTLD(urlObj.hostname);
      if (!tldCheck.valid) {
        return tldCheck;
      }

      // 6. DNS lookup per protezione SSRF
      const dnsCheck = await this.validateDNS(urlObj.hostname);
      if (!dnsCheck.valid) {
        return dnsCheck;
      }

      // 7. Normalizzazione finale
      const normalizedUrl = this.normalizeUrl(urlObj);

      this.logger.info(`URL validato: ${input} -> ${normalizedUrl}`);
      return { valid: true, normalizedUrl };

    } catch (error) {
      this.logger.error('Errore validazione URL:', error);
      return { valid: false, error: 'Errore interno durante validazione' };
    }
  }

  /**
   * Pulizia input base
   */
  private cleanInput(input: string): string {
    if (!input || typeof input !== 'string') {
      return '';
    }

    // Rimuovi spazi
    let cleaned = input.trim();
    
    // Aggiungi protocollo se mancante
    if (!cleaned.startsWith('http://') && !cleaned.startsWith('https://')) {
      cleaned = 'https://' + cleaned;
    }

    return cleaned;
  }

  /**
   * Validazione hostname
   */
  private validateHostname(hostname: string): ValidationResult {
    if (!hostname || hostname.length === 0) {
      return { valid: false, error: 'Hostname mancante' };
    }

    // Lunghezza massima
    if (hostname.length > 253) {
      return { valid: false, error: 'Hostname troppo lungo' };
    }

    // Caratteri validi
    if (!/^[a-zA-Z0-9.-]+$/.test(hostname)) {
      return { valid: false, error: 'Hostname contiene caratteri non validi' };
    }

    // Controllo blacklist
    const lowerHostname = hostname.toLowerCase();
    for (const blocked of this.blacklistedHosts) {
      if (lowerHostname === blocked || lowerHostname.startsWith(blocked)) {
        return { valid: false, error: 'Hostname non permesso (rete privata o localhost)' };
      }
    }

    // Controllo IP address format
    if (this.isIPAddress(hostname)) {
      if (this.isPrivateIP(hostname)) {
        return { valid: false, error: 'Indirizzo IP privato non permesso' };
      }
    }

    return { valid: true };
  }

  /**
   * Validazione TLD
   */
  private validateTLD(hostname: string): ValidationResult {
    const lowerHostname = hostname.toLowerCase();
    
    for (const tld of this.blacklistedTlds) {
      if (lowerHostname.endsWith(tld)) {
        return { valid: false, error: `TLD non permesso: ${tld}` };
      }
    }

    // Deve avere almeno un punto (tranne per IP)
    if (!this.isIPAddress(hostname) && !hostname.includes('.')) {
      return { valid: false, error: 'Dominio deve avere un TLD valido' };
    }

    return { valid: true };
  }

  /**
   * Validazione DNS con protezione SSRF
   */
  private async validateDNS(hostname: string): Promise<ValidationResult> {
    try {
      // Skip DNS per IP address (già validati)
      if (this.isIPAddress(hostname)) {
        return { valid: true };
      }

      // DNS lookup con timeout
      const result = await Promise.race([
        dnsLookup(hostname),
        new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error('DNS timeout')), 5000)
        )
      ]);

      // Controlla che l'IP risolto non sia privato
      if (this.isPrivateIP(result.address)) {
        return { valid: false, error: 'Il dominio risolve a un IP privato' };
      }

      return { valid: true };

    } catch (error) {
      this.logger.warn(`DNS lookup fallito per ${hostname}:`, error);
      return { valid: false, error: 'Dominio non risolve o non esistente' };
    }
  }

  /**
   * Normalizzazione URL finale
   */
  private normalizeUrl(urlObj: URL): string {
    // Rimuovi trailing slash se non necessario
    if (urlObj.pathname === '/' && !urlObj.search && !urlObj.hash) {
      urlObj.pathname = '';
    }

    // Converte a lowercase hostname
    urlObj.hostname = urlObj.hostname.toLowerCase();

    return urlObj.toString();
  }

  /**
   * Controlla se è un indirizzo IP
   */
  private isIPAddress(hostname: string): boolean {
    // IPv4
    const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
    if (ipv4Regex.test(hostname)) {
      return true;
    }

    // IPv6 (semplificato)
    const ipv6Regex = /^([0-9a-fA-F]{0,4}:){2,7}[0-9a-fA-F]{0,4}$/;
    if (ipv6Regex.test(hostname)) {
      return true;
    }

    return false;
  }

  /**
   * Controlla se è un IP privato
   */
  private isPrivateIP(ip: string): boolean {
    // IPv4 private ranges
    if (ip.startsWith('10.') ||
        ip.startsWith('127.') ||
        ip.startsWith('169.254.') ||
        /^172\.(1[6-9]|2\d|3[01])\./.test(ip) ||
        ip.startsWith('192.168.')) {
      return true;
    }

    // IPv6 private/local
    if (ip.startsWith('::1') ||
        ip.startsWith('fc00:') ||
        ip.startsWith('fd00:') ||
        ip.startsWith('fe80:')) {
      return true;
    }

    return false;
  }

  /**
   * Validazione rapida per casi semplici
   */
  validateQuick(input: string): boolean {
    try {
      const cleaned = this.cleanInput(input);
      if (!cleaned) return false;

      const urlObj = new URL(cleaned);
      
      // Controlli base
      if (!['http:', 'https:'].includes(urlObj.protocol)) return false;
      if (!urlObj.hostname) return false;
      
      // Controllo blacklist rapido
      const hostname = urlObj.hostname.toLowerCase();
      for (const blocked of this.blacklistedHosts) {
        if (hostname === blocked || hostname.startsWith(blocked)) {
          return false;
        }
      }

      return true;
    } catch {
      return false;
    }
  }
}
