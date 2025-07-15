"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter, useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { WebsiteAnalysis, EnhancedWebsiteAnalysis } from "@/lib/types/analysis";
import { TourTarget } from "@/components/onboarding/TourTarget";
import {
  ArrowLeft,
  ExternalLink,
  Phone,
  Mail,
  MapPin,
  Globe,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  Zap,
  Eye,
  TrendingDown,
  BarChart3,
  PieChart,
  Activity,
  Shield,
  Facebook,
  Instagram,
  Linkedin,
  Twitter,
  Youtube,
  Search,
  Smartphone,
  MessageCircle,
  Users,
  TrendingUp,
  Calendar,
  Star,
  Hash,
} from "lucide-react";
import LeadDigitalServices from "@/components/LeadDigitalServices";

interface Lead {
  id: string;
  business_name: string;
  website_url: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  category: string;
  score: number;
  needed_roles: string[];
  issues: string[];
  // Struttura moderna (priorità)
  website_analysis?: EnhancedWebsiteAnalysis;
  // Struttura legacy (fallback)
  analysis?: WebsiteAnalysis;
  created_at: string;
  last_seen_at: string;
  assigned_to: string;
  origin?: "scraping" | "manual";
}

export default function LeadDetailPage() {
  const { user, refreshProfile } = useAuth();
  const router = useRouter();
  const params = useParams();
  const leadId = params.id as string;

  const [lead, setLead] = useState<Lead | null>(null);
  const [analysis, setAnalysis] = useState<EnhancedWebsiteAnalysis | WebsiteAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [creditConsumed, setCreditConsumed] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user && leadId) {
      loadLeadDetails();
    }
  }, [user, leadId]);

  const loadLeadDetails = async () => {
    try {
      setLoading(true);

      // Prima verifica se l'utente ha già sbloccato questo lead
      const { data: unlockedLeads, error: unlockedError } = await supabase.rpc(
        "get_user_unlocked_leads",
        { p_user_id: user?.id }
      );

      if (unlockedError) {
        console.error("Errore verifica lead sbloccati:", unlockedError);
      }

      const isAlreadyUnlocked = unlockedLeads?.some(
        (ul: any) => ul.lead_id === leadId
      );

      // Se non è già sbloccato, verifica che l'utente abbia crediti sufficienti
      if (!isAlreadyUnlocked && (!user || (user.credits_remaining || 0) <= 0)) {
        setError("Crediti insufficienti per visualizzare i dettagli del lead");
        return;
      }

      // Carica il lead
      const { data: leadData, error: leadError } = await supabase
        .from("leads")
        .select("*")
        .eq("id", leadId)
        .single();

      if (leadError) {
        setError("Lead non trovato");
        return;
      }

      // Verifica se l'utente può vedere questo lead
      if (
        user?.role !== "admin" &&
        leadData.assigned_to &&
        leadData.assigned_to !== user?.id
      ) {
        setError("Non hai i permessi per visualizzare questo lead");
        return;
      }

      setLead(leadData);

      // Carica l'analisi se disponibile - priorità alla struttura moderna
      if (leadData.website_analysis) {
        setAnalysis(leadData.website_analysis);
      } else if (leadData.analysis) {
        // Fallback alla struttura legacy
        setAnalysis(leadData.analysis);
      }

      // Consuma 1 credito solo se non già sbloccato
      if (!isAlreadyUnlocked && !creditConsumed) {
        await consumeCredit();
      } else if (isAlreadyUnlocked) {
        setCreditConsumed(true); // Marca come già consumato per evitare doppi consumi
      }
    } catch (error) {
      console.error("Errore caricamento lead:", error);
      setError("Errore nel caricamento del lead");
    } finally {
      setLoading(false);
    }
  };

  const consumeCredit = async () => {
    try {
      if (!user) return;

      // Ottieni la sessione per il token
      const session = await supabase.auth.getSession()
      if (!session.data.session) {
        alert('Errore di autenticazione. Ricarica la pagina.')
        return
      }

      // Usa l'API REST per sbloccare il lead (gestisce automaticamente crediti e registrazione)
      const response = await fetch(`/api/leads/${leadId}/unlock`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.data.session.access_token}`,
          'Content-Type': 'application/json',
        },
        credentials: 'include', // Include cookies per l'autenticazione
      });

      const data = await response.json();

      if (!response.ok) {
        console.error('Errore API unlock:', data.error);
        alert(data.error || 'Errore nel sbloccare il lead. Riprova.');
        return;
      }

      setCreditConsumed(true);
      await refreshProfile();
    } catch (error) {
      console.error("Errore consumo credito:", error);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-600";
    if (score >= 60) return "text-yellow-600";
    if (score >= 40) return "text-orange-600";
    return "text-red-600";
  };

  const getScoreBgColor = (score: number) => {
    if (score >= 80) return "bg-green-100 dark:bg-green-900/20";
    if (score >= 60) return "bg-yellow-100 dark:bg-yellow-900/20";
    if (score >= 40) return "bg-orange-100 dark:bg-orange-900/20";
    return "bg-red-100 dark:bg-red-900/20";
  };

  // Type guard per distinguere tra le due strutture
  const isEnhancedAnalysis = (analysis: any): analysis is EnhancedWebsiteAnalysis => {
    return analysis && 
           typeof analysis.seo === 'object' && 
           analysis.seo.hasTitle !== undefined &&
           analysis.performance && 
           typeof analysis.performance.overallScore === 'number';
  };

  const isLegacyAnalysis = (analysis: any): analysis is WebsiteAnalysis => {
    return analysis && 
           typeof analysis.seo === 'object' && 
           analysis.seo.hasTitle !== undefined &&
           analysis.performance && 
           typeof analysis.performance.isResponsive === 'boolean';
  };

  // Funzioni helper per compatibilità con vecchio e nuovo formato
  const getSEOScore = (): number => {
    if (!analysis) return 0;

    // Struttura Enhanced - controlla prima se è la nuova struttura con seo object
    if (isEnhancedAnalysis(analysis) && analysis.seo) {
      const seo = analysis.seo;
      
      // Se abbiamo score precalcolato, usalo
      if ((seo as any).score !== undefined) {
        return (seo as any).score;
      }

      // Calcola score basato sui dati disponibili
      let score = 100;
      if (seo.hasTitle === false) score -= 20;
      if (seo.hasMetaDescription === false) score -= 20;
      if (seo.hasH1 === false) score -= 15;
      if (seo.titleLength && (seo.titleLength < 30 || seo.titleLength > 60)) score -= 10;
      if (seo.metaDescriptionLength && (seo.metaDescriptionLength < 120 || seo.metaDescriptionLength > 160)) score -= 10;
      if (seo.hasStructuredData === false) score -= 5;
      
      return Math.max(0, score);
    }

    // Struttura Legacy
    if (isLegacyAnalysis(analysis) && analysis.seo) {
      const seo = analysis.seo;
      let score = 100;
      
      if (seo.hasTitle === false) score -= 20;
      if (seo.hasMetaDescription === false) score -= 20;
      if (seo.hasH1 === false) score -= 15;
      if (seo.titleLength < 30 || seo.titleLength > 60) score -= 10;
      if (seo.metaDescriptionLength < 120 || seo.metaDescriptionLength > 160) score -= 10;
      if (seo.hasStructuredData === false) score -= 5;
      
      return Math.max(0, score);
    }

    // Controlla se c'è almeno un oggetto seo nella struttura analysis
    if ((analysis as any).seo) {
      const seo = (analysis as any).seo;
      let score = 100;
      
      if (seo.hasTitle === false) score -= 20;
      if (seo.hasMetaDescription === false) score -= 20;
      if (seo.hasH1 === false) score -= 15;
      if (seo.titleLength && (seo.titleLength < 30 || seo.titleLength > 60)) score -= 10;
      if (seo.metaDescriptionLength && (seo.metaDescriptionLength < 120 || seo.metaDescriptionLength > 160)) score -= 10;
      if (seo.hasStructuredData === false) score -= 5;
      
      return Math.max(0, score);
    }

    // Fallback per strutture molto vecchie
    if (analysis && typeof analysis === 'object' && 'seo_score' in analysis) {
      return (analysis as any).seo_score || 0;
    }

    return 0;
  };

  const getPerformanceScore = (): number => {
    if (!analysis) return 0;

    // Struttura Enhanced - controlla prima se c'è performance object
    if (isEnhancedAnalysis(analysis) && analysis.performance) {
      const perf = analysis.performance;
      
      // Usa il punteggio precalcolato se disponibile
      if (perf.overallScore !== undefined) {
        return perf.overallScore;
      }

      // Controlla se c'è speedScore nella nuova struttura
      if ((perf as any).speedScore !== undefined) {
        return (perf as any).speedScore;
      }

      // Calcola score basato sui dati disponibili
      let score = 100;
      if (perf.loadTime > 5000) score -= 40;
      else if (perf.loadTime > 3000) score -= 30;
      else if (perf.loadTime > 2000) score -= 15;
      else if (perf.loadTime > 1000) score -= 5;
      
      // Usa images.broken invece di performance.brokenImages
      if (analysis.images && analysis.images.broken > 0) {
        if (analysis.images.broken > 5) score -= 30;
        else score -= 20;
      }
      
      // Usa mobile.isMobileFriendly invece di performance.isResponsive
      if (analysis.mobile && analysis.mobile.isMobileFriendly === false) {
        score -= 25;
      }
      
      // Considera Core Web Vitals se disponibili
      if (perf.coreWebVitals) {
        const cwv = perf.coreWebVitals;
        if (cwv.lcp > 2500) score -= 15;
        if (cwv.fid > 100) score -= 10;
        if (cwv.cls > 0.1) score -= 10;
      }
      
      return Math.max(0, score);
    }

    // Struttura Legacy
    if (isLegacyAnalysis(analysis) && analysis.performance) {
      const perf = analysis.performance;
      let score = 100;
      
      if (perf.loadTime > 5000) score -= 40;
      else if (perf.loadTime > 3000) score -= 30;
      else if (perf.loadTime > 2000) score -= 15;
      else if (perf.loadTime > 1000) score -= 5;
      
      if (perf.brokenImages > 5) score -= 30;
      else if (perf.brokenImages > 0) score -= 20;
      
      if (perf.isResponsive === false) score -= 25;
      
      return Math.max(0, score);
    }

    // Controlla se c'è almeno un oggetto performance nella struttura analysis
    if ((analysis as any).performance) {
      const perf = (analysis as any).performance;
      
      // Controlla se c'è speedScore nella nuova struttura
      if (perf.speedScore !== undefined) {
        return perf.speedScore;
      }

      // Calcola basato su loadComplete o altri campi disponibili
      let score = 100;
      const loadTime = perf.loadComplete || perf.loadTime;
      if (loadTime) {
        if (loadTime > 5000) score -= 40;
        else if (loadTime > 3000) score -= 30;
        else if (loadTime > 2000) score -= 15;
        else if (loadTime > 1000) score -= 5;
      }
      
      // Considera altri metriche se disponibili
      if (perf.lcp && perf.lcp > 2500) score -= 15;
      if (perf.cls && perf.cls > 0.1) score -= 10;
      if (perf.ttfb && perf.ttfb > 600) score -= 10;
      
      return Math.max(0, score);
    }

    // Fallback per strutture molto vecchie
    if (analysis && typeof analysis === 'object' && 'page_speed_score' in analysis) {
      return (analysis as any).page_speed_score || 0;
    }

    return 0;
  };

  const getOverallScore = (): number => {
    if (!analysis) return lead?.score || 0;
    
    // Struttura Enhanced
    if (isEnhancedAnalysis(analysis)) {
      return analysis.overallScore || lead?.score || 0;
    }
    
    // Struttura Legacy
    if (isLegacyAnalysis(analysis)) {
      return analysis.overallScore || lead?.score || 0;
    }
    
    // Controlla se c'è overallScore direttamente nell'analysis
    if ((analysis as any).overallScore !== undefined) {
      return (analysis as any).overallScore;
    }
    
    // Fallback per strutture molto vecchie
    if (analysis && typeof analysis === 'object' && 'overall_score' in analysis) {
      return (analysis as any).overall_score || lead?.score || 0;
    }
    
    return lead?.score || 0;
  };

  // Funzione helper per compatibilità con il vecchio codice
  const isNewFormat = (): boolean => {
    return isEnhancedAnalysis(analysis);
  };

  // Funzioni helper per generare raccomandazioni intelligenti
  const generateRecommendations = () => {
    const recommendations: {
      category: string;
      title: string;
      description: string;
      priority: "high" | "medium" | "low";
    }[] = [];

    if (!analysis) return recommendations;

    // Struttura Enhanced
    if (isEnhancedAnalysis(analysis)) {
      // SEO Raccomandazioni
      if (!analysis.seo.hasTitle) {
        recommendations.push({
          category: "SEO",
          title: "Aggiungi un Tag Title",
          description:
            "Il sito non ha un tag title. Aggiungi un titolo descrittivo (50-60 caratteri) per migliorare la visibilità sui motori di ricerca.",
          priority: "high",
        });
      }

      if (!analysis.seo.hasMetaDescription) {
        recommendations.push({
          category: "SEO",
          title: "Aggiungi Meta Description",
          description:
            "Manca la meta description. Scrivi una descrizione accattivante (150-160 caratteri) per migliorare il click-through rate.",
          priority: "high",
        });
      }

      if (!analysis.seo.hasH1) {
        recommendations.push({
          category: "SEO",
          title: "Aggiungi Tag H1",
          description:
            "Il sito non ha un tag H1. Aggiungi un titolo principale che descriva chiaramente il contenuto della pagina.",
          priority: "medium",
        });
      }

      if (!analysis.seo.hasStructuredData) {
        recommendations.push({
          category: "SEO",
          title: "Implementa Dati Strutturati",
          description:
            "Aggiungi markup schema.org per aiutare i motori di ricerca a comprendere meglio il contenuto del sito.",
          priority: "medium",
        });
      }

      // Performance Raccomandazioni
      if (analysis.performance.loadTime > 3000) {
        recommendations.push({
          category: "Performance",
          title: "Ottimizza Velocità di Caricamento",
          description: `Il sito impiega ${Math.round(
            analysis.performance.loadTime / 1000
          )}s per caricarsi. Ottimizza immagini, CSS e JavaScript per migliorare l\'esperienza utente.`,
          priority: "high",
        });
      }

      // Usa images.broken invece di performance.brokenImages
      if (analysis.images && analysis.images.broken > 0) {
        recommendations.push({
          category: "Performance",
          title: "Correggi Immagini Rotte",
          description: `Trovate ${analysis.images.broken} immagini non funzionanti. Sostituiscile o rimuovile per migliorare l\'esperienza utente.`,
          priority: "medium",
        });
      }

      // Usa mobile.isMobileFriendly invece di performance.isResponsive
      if (analysis.mobile && !analysis.mobile.isMobileFriendly) {
        recommendations.push({
          category: "Performance",
          title: "Rendi il Sito Responsive",
          description:
            "Il sito non è ottimizzato per dispositivi mobili. Implementa un design responsive per raggiungere più utenti.",
          priority: "high",
        });
      }

      // Tracking Raccomandazioni
      if (!analysis.tracking.googleAnalytics && !analysis.tracking.hasGoogleAnalytics) {
        recommendations.push({
          category: "Analytics",
          title: "Installa Google Analytics",
          description:
            "Aggiungi Google Analytics per monitorare il traffico del sito e comprendere meglio i visitatori.",
          priority: "medium",
        });
      }

      if (!analysis.tracking.facebookPixel && !analysis.tracking.hasFacebookPixel) {
        recommendations.push({
          category: "Marketing",
          title: "Installa Facebook Pixel",
          description:
            "Aggiungi il Facebook Pixel per tracciare conversioni e creare campagne pubblicitarie più efficaci su Facebook e Instagram.",
          priority: "medium",
        });
      }

      if (!analysis.tracking.googleTagManager && !analysis.tracking.hasGoogleTagManager) {
        recommendations.push({
          category: "Analytics",
          title: "Implementa Google Tag Manager",
          description:
            "GTM semplifica la gestione di tutti i tag di tracking senza modificare il codice del sito.",
          priority: "low",
        });
      }

      // GDPR Raccomandazioni
      if (!analysis.gdpr.hasCookieBanner) {
        recommendations.push({
          category: "Legale",
          title: "Aggiungi Cookie Banner",
          description:
            "Per rispettare il GDPR, aggiungi un banner per chiedere il consenso ai cookie prima di tracciare gli utenti.",
          priority: "high",
        });
      }

      if (!analysis.gdpr.hasPrivacyPolicy) {
        recommendations.push({
          category: "Legale",
          title: "Crea Privacy Policy",
          description:
            "Obbligatoria per legge, la privacy policy deve spiegare come vengono trattati i dati personali degli utenti.",
          priority: "high",
        });
      }

      if (!analysis.gdpr.hasTermsOfService) {
        recommendations.push({
          category: "Legale",
          title: "Aggiungi Termini di Servizio",
          description:
            "I termini di servizio proteggono legalmente la tua attività e definiscono le regole di utilizzo del sito.",
          priority: "medium",
        });
      }

      // Social Raccomandazioni
      if (analysis.social && (!analysis.social.hasAnySocial || analysis.social.socialCount === 0)) {
        recommendations.push({
          category: "Social Media",
          title: "Aggiungi Presenza Social",
          description:
            "Crea profili social (Facebook, Instagram, LinkedIn) e collegali al sito per aumentare la credibilità e raggiungere più clienti.",
          priority: "medium",
        });
      }

      // GDPR compliance includes business data requirements
      if (!analysis.gdpr.hasVatNumber) {
        recommendations.push({
          category: "Legale",
          title: "Mostra Partita IVA",
          description:
            "Per legge, i siti aziendali devono mostrare chiaramente la Partita IVA e i dati della società.",
          priority: "high",
        });
      }

    } else if (isLegacyAnalysis(analysis)) {
      // Struttura Legacy - Raccomandazioni basate sui campi disponibili
      if (!analysis.seo.hasTitle) {
        recommendations.push({
          category: "SEO",
          title: "Aggiungi un Tag Title",
          description:
            "Il sito non ha un tag title. Aggiungi un titolo descrittivo (50-60 caratteri) per migliorare la visibilità sui motori di ricerca.",
          priority: "high",
        });
      }

      if (!analysis.seo.hasMetaDescription) {
        recommendations.push({
          category: "SEO",
          title: "Aggiungi Meta Description",
          description:
            "Manca la meta description. Scrivi una descrizione accattivante (150-160 caratteri) per migliorare il click-through rate.",
          priority: "high",
        });
      }

      if (!analysis.tracking.hasGoogleAnalytics) {
        recommendations.push({
          category: "Analytics",
          title: "Installa Google Analytics",
          description:
            "Aggiungi Google Analytics per monitorare il traffico del sito e comprendere meglio i visitatori.",
          priority: "medium",
        });
      }

      if (analysis.performance.brokenImages > 0) {
        recommendations.push({
          category: "Performance",
          title: "Correggi Immagini Rotte",
          description:
            "Trovate immagini non funzionanti. Sostituiscile o rimuovile per migliorare l'esperienza utente.",
          priority: "medium",
        });
      }

      if (analysis.performance.loadTime > 3000) {
        recommendations.push({
          category: "Performance",
          title: "Ottimizza Velocità di Caricamento",
          description: `Il sito impiega ${Math.round(
            analysis.performance.loadTime / 1000
          )}s per caricarsi. Ottimizza per migliorare l\'esperienza utente.`,
          priority: "high",
        });
      }

    } else {
      // Fallback per strutture molto vecchie con proprietà flat
      const analysisAny = analysis as any;
      
      if (analysisAny.missing_meta_tags && analysisAny.missing_meta_tags.length > 0) {
        recommendations.push({
          category: "SEO",
          title: "Aggiungi Meta Tag Mancanti",
          description: `Mancano ${
            analysisAny.missing_meta_tags.length
          } meta tag importanti: ${analysisAny.missing_meta_tags.join(
            ", "
          )}. Aggiungili per migliorare la SEO.`,
          priority: "high",
        });
      }

      if (!analysisAny.has_tracking_pixel) {
        recommendations.push({
          category: "Marketing",
          title: "Installa Pixel di Tracking",
          description:
            "Aggiungi pixel di tracking (Facebook, Google) per monitorare conversioni e migliorare le campagne pubblicitarie.",
          priority: "medium",
        });
      }

      if (analysisAny.broken_images) {
        recommendations.push({
          category: "Performance",
          title: "Correggi Immagini Rotte",
          description:
            "Trovate immagini non funzionanti. Sostituiscile o rimuovile per migliorare l'esperienza utente.",
          priority: "medium",
        });
      }

      if (analysisAny.website_load_time && analysisAny.website_load_time > 3000) {
        recommendations.push({
          category: "Performance",
          title: "Ottimizza Velocità di Caricamento",
          description: `Il sito impiega ${Math.round(
            analysisAny.website_load_time / 1000
          )}s per caricarsi. Ottimizza per migliorare l\'esperienza utente.`,
          priority: "high",
        });
      }
    }

    // Ordina per priorità
    const priorityOrder = { high: 3, medium: 2, low: 1 };
    return recommendations.sort(
      (a, b) => priorityOrder[b.priority] - priorityOrder[a.priority]
    );
  };

  const getPriorityColor = (priority: "high" | "medium" | "low") => {
    switch (priority) {
      case "high":
        return "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300";
      case "medium":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300";
      case "low":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300";
    }
  };

  const getPriorityIcon = (priority: "high" | "medium" | "low") => {
    switch (priority) {
      case "high":
        return <AlertTriangle className="h-4 w-4" />;
      case "medium":
        return <Clock className="h-4 w-4" />;
      case "low":
        return <TrendingDown className="h-4 w-4" />;
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "SEO":
        return <Search className="h-4 w-4 text-green-600" />;
      case "Performance":
        return <Zap className="h-4 w-4 text-yellow-600" />;
      case "Analytics":
        return <BarChart3 className="h-4 w-4 text-blue-600" />;
      case "Marketing":
        return <Eye className="h-4 w-4 text-purple-600" />;
      case "Legale":
        return <Shield className="h-4 w-4 text-red-600" />;
      case "Social Media":
        return <Activity className="h-4 w-4 text-pink-600" />;
      default:
        return <AlertTriangle className="h-4 w-4 text-gray-600" />;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">
            Caricamento dettagli lead...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            Errore
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mb-4">{error}</p>
          <button
            onClick={() => router.back()}
            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition-colors"
          >
            Torna Indietro
          </button>
        </div>
      </div>
    );
  }

  if (!lead) return null;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="max-w-6xl mx-auto px-4">
        {/* Header */}
        <TourTarget tourId="lead-header" className="mb-8">
          <button
            onClick={() => router.back()}
            className="flex items-center text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-4 transition-colors"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Torna ai Lead
          </button>

          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                {lead.business_name}
              </h1>
              <div className="flex items-center space-x-4 text-sm text-gray-600 dark:text-gray-400">
                <span className="flex items-center">
                  <MapPin className="h-4 w-4 mr-1" />
                  {lead.city}
                </span>
                <span className="px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded-full">
                  {lead.category}
                </span>
              </div>
            </div>

            <TourTarget tourId="lead-detail-score" className={`text-right p-4 rounded-xl ${getScoreBgColor(lead.score)}`}>
              <div
                className={`text-2xl font-bold ${getScoreColor(lead.score)}`}
              >
                {lead.score}/100
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Punteggio Tecnico
              </div>
            </TourTarget>
          </div>
        </TourTarget>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Colonna Sinistra - Info Principali */}
          <div className="lg:col-span-1 space-y-6">
            {/* Informazioni di Contatto */}
            <TourTarget tourId="contact-info" className="bg-white dark:bg-gray-800 rounded-xl p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Informazioni di Contatto
              </h2>

              <div className="space-y-3">
                {lead.website_url && (
                  <div className="flex items-center">
                    <Globe className="h-4 w-4 text-gray-400 mr-3" />
                    <a
                      href={lead.website_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-700 hover:underline"
                    >
                      {lead.website_url}
                    </a>
                  </div>
                )}

                {lead.phone && (
                  <div className="flex items-center">
                    <Phone className="h-4 w-4 text-gray-400 mr-3" />
                    <a
                      href={`tel:${lead.phone}`}
                      className="text-gray-900 dark:text-white hover:text-blue-600"
                    >
                      {lead.phone}
                    </a>
                  </div>
                )}

                {lead.email && (
                  <div className="flex items-center">
                    <Mail className="h-4 w-4 text-gray-400 mr-3" />
                    <a
                      href={`mailto:${lead.email}`}
                      className="text-blue-600 hover:text-blue-700 hover:underline"
                    >
                      {lead.email}
                    </a>
                  </div>
                )}

                {lead.address && (
                  <div className="flex items-start">
                    <MapPin className="h-4 w-4 text-gray-400 mr-3 mt-0.5" />
                    <span className="text-gray-900 dark:text-white">
                      {lead.address}
                    </span>
                  </div>
                )}
              </div>
            </TourTarget>

            {/* Ruoli Necessari */}
            {lead.needed_roles && lead.needed_roles.length > 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-xl p-6">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Opportunità di Business
                </h2>

                <div className="flex flex-wrap gap-2">
                  {lead.needed_roles.map((role, index) => (
                    <span
                      key={index}
                      className="px-3 py-1 bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded-full text-sm"
                    >
                      {role}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Raccomandazioni per il Cliente */}
            {analysis && (
              <div className="bg-white dark:bg-gray-800 rounded-xl p-6">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                  <Activity className="h-5 w-5 mr-2 text-green-600" />
                  Raccomandazioni per il Cliente
                </h2>

                <div className="space-y-4">
                  {generateRecommendations().map((rec, index) => (
                    <div
                      key={index}
                      className="border border-gray-200 dark:border-gray-700 rounded-lg p-4"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          {getCategoryIcon(rec.category)}
                          <span className="text-sm font-medium text-gray-900 dark:text-white">
                            {rec.title}
                          </span>
                        </div>
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium flex items-center space-x-1 ${getPriorityColor(
                            rec.priority
                          )}`}
                        >
                          {getPriorityIcon(rec.priority)}
                          <span className="ml-1 capitalize">
                            {rec.priority === "high"
                              ? "Alta"
                              : rec.priority === "medium"
                              ? "Media"
                              : "Bassa"}
                          </span>
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                        {rec.description}
                      </p>
                      <div className="mt-2">
                        <span className="inline-block px-2 py-1 bg-gray-100 dark:bg-gray-900 text-xs text-gray-600 dark:text-gray-400 rounded">
                          {rec.category}
                        </span>
                      </div>
                    </div>
                  ))}

                  {generateRecommendations().length === 0 && (
                    <div className="text-center py-8">
                      <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-3" />
                      <p className="text-gray-600 dark:text-gray-400">
                        Ottimo! Non sono stati identificati problemi critici.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Problemi Legacy (se presenti) */}
            {lead.issues && lead.issues.length > 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-xl p-6">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Problemi Identificati (Legacy)
                </h2>

                <div className="space-y-2">
                  {lead.issues.map((issue, index) => (
                    <div key={index} className="flex items-start">
                      <AlertTriangle className="h-4 w-4 text-orange-500 mr-2 mt-0.5 flex-shrink-0" />
                      <span className="text-sm text-gray-700 dark:text-gray-300">
                        {issue}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Colonna Destra - Analisi Tecnica */}
          <div className="lg:col-span-2 space-y-6">
            {analysis && (
              <>
                {/* Overview Metriche */}
                <TourTarget tourId="technical-analysis" className="bg-white dark:bg-gray-800 rounded-xl p-6">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">
                    Analisi Tecnica Completa
                  </h2>

                  <div className="mb-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg">
                    <div className="flex items-center">
                      <AlertTriangle className="h-4 w-4 text-yellow-600 mr-2" />
                      <span className="text-sm text-yellow-800 dark:text-yellow-200">
                        <strong>Attenzione:</strong> Il sistema è ancora in fase
                        di perfezionamento. Alcuni dettagli potrebbero essere
                        incompleti o imprecisi.
                      </span>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                      <div
                        className={`text-2xl font-bold ${getScoreColor(
                          getSEOScore()
                        )}`}
                      >
                        {getSEOScore()}
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        SEO Score
                      </div>
                    </div>

                    <div className="text-center p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                      <div
                        className={`text-2xl font-bold ${getScoreColor(
                          getPerformanceScore()
                        )}`}
                      >
                        {getPerformanceScore()}
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        Velocità
                      </div>
                    </div>

                    <div className="text-center p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                      <div
                        className={`text-2xl font-bold ${getScoreColor(
                          getOverallScore()
                        )}`}
                      >
                        {getOverallScore()}
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        Punteggio
                      </div>
                    </div>

                    <div className="text-center p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                      <div className="text-2xl font-bold text-blue-600">
                        {(() => {
                          // Gestione del tempo di caricamento per strutture diverse
                          if (isEnhancedAnalysis(analysis)) {
                            const loadTime = analysis.performance?.loadTime;
                            return loadTime ? Math.round((loadTime / 1000) * 10) / 10 : "N/A";
                          } else if (isLegacyAnalysis(analysis)) {
                            const loadTime = analysis.performance?.loadTime;
                            return loadTime ? Math.round((loadTime / 1000) * 10) / 10 : "N/A";
                          } else {
                            // Fallback per strutture molto vecchie
                            const analysisAny = analysis as any;
                            const loadTime = analysisAny.website_load_time || analysisAny.performance?.loadComplete || analysisAny.performance?.loadTime;
                            return loadTime ? Math.round((loadTime / 1000) * 10) / 10 : "N/A";
                          }
                        })()}
                        {(() => {
                          if (isEnhancedAnalysis(analysis)) {
                            return analysis.performance?.loadTime ? "s" : "";
                          } else if (isLegacyAnalysis(analysis)) {
                            return analysis.performance?.loadTime ? "s" : "";
                          } else {
                            const analysisAny = analysis as any;
                            return analysisAny.website_load_time || analysisAny.performance?.loadComplete || analysisAny.performance?.loadTime ? "s" : "";
                          }
                        })()}
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        Caricamento
                      </div>
                    </div>
                  </div>
                </TourTarget>

                {/* Riepilogo Raccomandazioni Migliorato */}
                <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-xl p-6">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                    <PieChart className="h-5 w-5 mr-2 text-purple-600" />
                    Riepilogo Opportunità
                  </h3>
                  {(() => {
                    const recommendations = generateRecommendations();
                    const groupedByCategory = recommendations.reduce((acc, rec) => {
                      if (!acc[rec.category]) acc[rec.category] = [];
                      acc[rec.category].push(rec);
                      return acc;
                    }, {} as Record<string, typeof recommendations>);
                    const groupedByPriority = recommendations.reduce((acc, rec) => {
                      if (!acc[rec.priority]) acc[rec.priority] = [];
                      acc[rec.priority].push(rec);
                      return acc;
                    }, {} as Record<string, typeof recommendations>);
                    return (
                      <>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                          <div className="text-center p-4 bg-white dark:bg-gray-800 rounded-lg cursor-pointer" title="Vedi dettagli Priorità Alta">
                            <div className="text-2xl font-bold text-red-600">{groupedByPriority.high?.length || 0}</div>
                            <div className="text-sm text-gray-600 dark:text-gray-400">Priorità Alta</div>
                            {groupedByPriority.high?.length > 0 && (
                              <ul className="mt-2 space-y-1 text-left">
                                {groupedByPriority.high.map((rec, idx) => (
                                  <li key={idx} className="flex items-center text-xs text-red-700 dark:text-red-300">
                                    {getCategoryIcon(rec.category)}
                                    <span className="ml-1 font-medium">{rec.title}</span>
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>
                          <div className="text-center p-4 bg-white dark:bg-gray-800 rounded-lg cursor-pointer" title="Vedi dettagli Priorità Media">
                            <div className="text-2xl font-bold text-yellow-600">{groupedByPriority.medium?.length || 0}</div>
                            <div className="text-sm text-gray-600 dark:text-gray-400">Priorità Media</div>
                            {groupedByPriority.medium?.length > 0 && (
                              <ul className="mt-2 space-y-1 text-left">
                                {groupedByPriority.medium.map((rec, idx) => (
                                  <li key={idx} className="flex items-center text-xs text-yellow-700 dark:text-yellow-300">
                                    {getCategoryIcon(rec.category)}
                                    <span className="ml-1 font-medium">{rec.title}</span>
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>
                          <div className="text-center p-4 bg-white dark:bg-gray-800 rounded-lg">
                            <div className="text-2xl font-bold text-green-600">{Object.keys(groupedByCategory).length}</div>
                            <div className="text-sm text-gray-600 dark:text-gray-400">Aree Miglioramento</div>
                            {Object.keys(groupedByCategory).length > 0 && (
                              <ul className="mt-2 space-y-1 text-left">
                                {Object.entries(groupedByCategory).map(([cat, recs], idx) => (
                                  <li key={idx} className="flex items-center text-xs text-green-700 dark:text-green-300">
                                    {getCategoryIcon(cat)}
                                    <span className="ml-1 font-medium">{cat} ({recs.length})</span>
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>
                          <div className="text-center p-4 bg-white dark:bg-gray-800 rounded-lg">
                            <div className="text-2xl font-bold text-purple-600">{recommendations.length}</div>
                            <div className="text-sm text-gray-600 dark:text-gray-400">Tot. Raccomandazioni</div>
                          </div>
                        </div>
                        {recommendations.length > 0 && (
                          <div className="mt-2 p-3 bg-white dark:bg-gray-800 rounded-lg">
                            <p className="text-sm text-gray-600 dark:text-gray-400 text-center mb-2">
                              💡 <strong>Potenziale di vendita elevato!</strong> Questo cliente ha {recommendations.length} opportunità di miglioramento che puoi offrire.
                            </p>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                              {recommendations.map((rec, idx) => (
                                <div key={idx} className="flex items-start gap-2 bg-gray-50 dark:bg-gray-900/40 rounded p-2">
                                  {getCategoryIcon(rec.category)}
                                  <div>
                                    <span className="font-medium text-sm text-gray-900 dark:text-white">{rec.title}</span>
                                    <div className="text-xs text-gray-600 dark:text-gray-400">{rec.description}</div>
                                    <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-xs font-medium ${getPriorityColor(rec.priority)}`}>{rec.priority === 'high' ? 'Alta' : rec.priority === 'medium' ? 'Media' : 'Bassa'}</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </>
                    );
                  })()}
                </div>

                {/* Social Analysis Migliorata */}
                {((analysis as any).social || (analysis as any).content) && (
                  <div className="bg-white dark:bg-gray-800 rounded-xl p-6">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                      <Activity className="h-5 w-5 mr-2 text-pink-500" />
                      Presenza Social & Contatti
                    </h3>
                    
                    {/* Sezione Social Profiles */}
                    {(analysis as any).social?.profiles && (
                      <div className="mb-6">
                        <h4 className="text-md font-medium text-gray-900 dark:text-white mb-3 flex items-center">
                          <Users className="h-4 w-4 mr-2 text-pink-500" />
                          Profili Social Trovati
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                          {(analysis as any).social.profiles
                            .filter((profile: any) => profile.found && profile.url)
                            .map((profile: any, idx: number) => (
                              <a
                                key={idx}
                                href={profile.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center justify-between p-3 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-900/50 dark:to-gray-800/50 rounded-lg hover:from-blue-50 hover:to-purple-50 dark:hover:from-blue-900/20 dark:hover:to-purple-900/20 transition-all duration-200 group"
                              >
                                <div className="flex items-center">
                                  {profile.platform === 'facebook' && <Facebook className="h-5 w-5 text-blue-600 mr-3" />}
                                  {profile.platform === 'instagram' && <Instagram className="h-5 w-5 text-pink-500 mr-3" />}
                                  {profile.platform === 'linkedin' && <Linkedin className="h-5 w-5 text-blue-700 mr-3" />}
                                  {profile.platform === 'twitter' && <Twitter className="h-5 w-5 text-sky-500 mr-3" />}
                                  {profile.platform === 'youtube' && <Youtube className="h-5 w-5 text-red-600 mr-3" />}
                                  {profile.platform === 'whatsapp' && <MessageCircle className="h-5 w-5 text-green-500 mr-3" />}
                                  {!['facebook', 'instagram', 'linkedin', 'twitter', 'youtube', 'whatsapp'].includes(profile.platform) && (
                                    <Globe className="h-5 w-5 text-gray-500 mr-3" />
                                  )}
                                  <div>
                                    <span className="font-medium text-gray-900 dark:text-white capitalize">
                                      {profile.platform}
                                    </span>
                                    {profile.extra?.likes && (
                                      <div className="text-xs text-gray-600 dark:text-gray-400">
                                        {profile.extra.likes} likes
                                      </div>
                                    )}
                                    {profile.extra?.followers && (
                                      <div className="text-xs text-gray-600 dark:text-gray-400">
                                        {profile.extra.followers.toLocaleString()} follower
                                      </div>
                                    )}
                                  </div>
                                </div>
                                <ExternalLink className="h-4 w-4 text-gray-400 group-hover:text-blue-600 transition-colors" />
                              </a>
                            ))}
                        </div>
                        
                        {/* Engagement Sample se disponibile */}
                        {(analysis as any).social.profiles?.some((p: any) => p.extra?.engagementSample?.length > 0) && (
                          <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                            <h5 className="text-sm font-medium text-gray-900 dark:text-white mb-2 flex items-center">
                              <TrendingUp className="h-4 w-4 mr-2 text-blue-500" />
                              Anteprima Attività Social
                            </h5>
                            {(analysis as any).social.profiles
                              .filter((p: any) => p.extra?.engagementSample?.length > 0)
                              .slice(0, 2)
                              .map((profile: any, idx: number) => (
                                <div key={idx} className="mb-2 last:mb-0">
                                  <div className="text-xs font-medium text-blue-700 dark:text-blue-300 capitalize mb-1">
                                    {profile.platform}:
                                  </div>
                                  <div className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2">
                                    {profile.extra.engagementSample[0]?.substring(0, 150)}...
                                  </div>
                                </div>
                              ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Numeri di Telefono Trovati */}
                    {(analysis as any).content?.phoneNumbers?.length > 0 && (
                      <div className="mb-6">
                        <h4 className="text-md font-medium text-gray-900 dark:text-white mb-3 flex items-center">
                          <Phone className="h-4 w-4 mr-2 text-green-500" />
                          Numeri di Telefono Trovati ({(analysis as any).content.phoneNumbers.length})
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {(analysis as any).content.phoneNumbers.map((phone: string, idx: number) => (
                            <a
                              key={idx}
                              href={`tel:${phone}`}
                              className="flex items-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors group"
                            >
                              <Phone className="h-4 w-4 text-green-500 mr-3" />
                              <span className="font-mono text-gray-900 dark:text-white group-hover:text-green-700 dark:group-hover:text-green-300">
                                {phone}
                              </span>
                            </a>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Email Trovate */}
                    {(analysis as any).content?.emailAddresses?.length > 0 && (
                      <div className="mb-6">
                        <h4 className="text-md font-medium text-gray-900 dark:text-white mb-3 flex items-center">
                          <Mail className="h-4 w-4 mr-2 text-blue-500" />
                          Email Trovate ({(analysis as any).content.emailAddresses.length})
                        </h4>
                        <div className="grid grid-cols-1 gap-3">
                          {(analysis as any).content.emailAddresses.map((email: string, idx: number) => (
                            <a
                              key={idx}
                              href={`mailto:${email}`}
                              className="flex items-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors group"
                            >
                              <Mail className="h-4 w-4 text-blue-500 mr-3" />
                              <span className="font-mono text-gray-900 dark:text-white group-hover:text-blue-700 dark:group-hover:text-blue-300">
                                {email}
                              </span>
                            </a>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Riepilogo Social Summary */}
                    {(analysis as any).social?.summary?.length > 0 && (
                      <div className="mb-4">
                        <h4 className="text-md font-medium text-gray-900 dark:text-white mb-3 flex items-center">
                          <Hash className="h-4 w-4 mr-2 text-purple-500" />
                          Riepilogo Ricerca Social
                        </h4>
                        <div className="space-y-2">
                          {(analysis as any).social.summary.map((summary: string, idx: number) => (
                            <div key={idx} className="flex items-start p-2 bg-purple-50 dark:bg-purple-900/20 rounded text-sm">
                              <CheckCircle className="h-4 w-4 text-purple-500 mr-2 mt-0.5 flex-shrink-0" />
                              <span className="text-gray-700 dark:text-gray-300">{summary}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Statistiche Contatti */}
                    {(analysis as any).content && (
                      <div className="bg-gradient-to-r from-gray-50 to-blue-50 dark:from-gray-900/50 dark:to-blue-900/20 rounded-lg p-4">
                        <h4 className="text-md font-medium text-gray-900 dark:text-white mb-3 flex items-center">
                          <BarChart3 className="h-4 w-4 mr-2 text-gray-500" />
                          Statistiche Contatti
                        </h4>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          <div className="text-center">
                            <div className="text-xl font-bold text-blue-600">
                              {(analysis as any).content.phoneNumbers?.length || 0}
                            </div>
                            <div className="text-xs text-gray-600 dark:text-gray-400">Telefoni</div>
                          </div>
                          <div className="text-center">
                            <div className="text-xl font-bold text-green-600">
                              {(analysis as any).content.emailAddresses?.length || 0}
                            </div>
                            <div className="text-xs text-gray-600 dark:text-gray-400">Email</div>
                          </div>
                          <div className="text-center">
                            <div className="text-xl font-bold text-purple-600">
                              {(analysis as any).social?.profiles?.filter((p: any) => p.found).length || 0}
                            </div>
                            <div className="text-xs text-gray-600 dark:text-gray-400">Social</div>
                          </div>
                          <div className="text-center">
                            <div className="text-xl font-bold text-orange-600">
                              {(analysis as any).content.contentQualityScore || 'N/A'}
                            </div>
                            <div className="text-xs text-gray-600 dark:text-gray-400">Qualità</div>
                          </div>
                        </div>
                        
                        {/* Indicatori aggiuntivi */}
                        <div className="mt-4 flex flex-wrap gap-2">
                          {(analysis as any).content.hasContactForm && (
                            <span className="px-2 py-1 bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-300 rounded-full text-xs flex items-center">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Form Contatti
                            </span>
                          )}
                          {(analysis as any).content.hasMapEmbedded && (
                            <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded-full text-xs flex items-center">
                              <MapPin className="h-3 w-3 mr-1" />
                              Mappa
                            </span>
                          )}
                          {(analysis as any).content.hasBusinessHours && (
                            <span className="px-2 py-1 bg-purple-100 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 rounded-full text-xs flex items-center">
                              <Calendar className="h-3 w-3 mr-1" />
                              Orari
                            </span>
                          )}
                          {(analysis as any).content.wordCount && (
                            <span className="px-2 py-1 bg-gray-100 dark:bg-gray-900/20 text-gray-700 dark:text-gray-300 rounded-full text-xs">
                              {(analysis as any).content.wordCount.toLocaleString()} parole
                            </span>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Messaggio se nessun dato sociale trovato */}
                    {!(analysis as any).social?.profiles?.some((p: any) => p.found) && 
                     !(analysis as any).content?.phoneNumbers?.length &&
                     !(analysis as any).content?.emailAddresses?.length && (
                      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                        <Users className="h-12 w-12 mx-auto mb-3 text-gray-400" />
                        <p>Nessun contatto social o informazione di contatto rilevata</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Tech Stack */}
                {(analysis as any).techStack && (
                  <div className="bg-white dark:bg-gray-800 rounded-xl p-6">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                      <PieChart className="h-5 w-5 mr-2 text-blue-500" />
                      Stack Tecnologico
                    </h3>
                    <div className="flex flex-wrap gap-3 text-sm">
                      {(analysis as any).techStack.cms && <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded-full">CMS: {(analysis as any).techStack.cms}</span>}
                      {(analysis as any).techStack.ecommerce && <span className="px-2 py-1 bg-purple-100 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 rounded-full">Ecommerce: {(analysis as any).techStack.ecommerce}</span>}
                      {(analysis as any).techStack.framework && <span className="px-2 py-1 bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-300 rounded-full">Framework: {(analysis as any).techStack.framework}</span>}
                      {(analysis as any).techStack.libraries?.length > 0 && <span className="px-2 py-1 bg-yellow-100 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-300 rounded-full">Librerie: {(analysis as any).techStack.libraries.join(', ')}</span>}
                      {(analysis as any).techStack.plugins?.length > 0 && <span className="px-2 py-1 bg-pink-100 dark:bg-pink-900/20 text-pink-700 dark:text-pink-300 rounded-full">Plugin: {(analysis as any).techStack.plugins.join(', ')}</span>}
                    </div>
                  </div>
                )}

                {/* GDPR & Legal */}
                {analysis.gdpr && (
                  <div className="bg-white dark:bg-gray-800 rounded-xl p-6">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                      <Shield className="h-5 w-5 mr-2 text-red-500" />
                      GDPR & Legal
                    </h3>
                    <div className="flex flex-wrap gap-3 text-sm">
                      <span className={`px-2 py-1 rounded-full ${analysis.gdpr.hasCookieBanner ? 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-300' : 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-300'}`}>Cookie Banner: {analysis.gdpr.hasCookieBanner ? 'Presente' : 'Assente'}</span>
                      <span className={`px-2 py-1 rounded-full ${analysis.gdpr.hasPrivacyPolicy ? 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-300' : 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-300'}`}>Privacy Policy: {analysis.gdpr.hasPrivacyPolicy ? 'Presente' : 'Assente'}</span>
                      <span className={`px-2 py-1 rounded-full ${analysis.gdpr.hasTermsOfService ? 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-300' : 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-300'}`}>Termini di Servizio: {analysis.gdpr.hasTermsOfService ? 'Presenti' : 'Assenti'}</span>
                      <span className={`px-2 py-1 rounded-full ${((analysis.gdpr as any).hasVatNumber || (analysis.gdpr as any).hasBusinessAddress) ? 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-300' : 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-300'}`}>P.IVA: {((analysis.gdpr as any).hasVatNumber || (analysis.gdpr as any).hasBusinessAddress) ? 'Presente' : 'Assente'}</span>
                      {((analysis.gdpr as any).vatNumbers as string[])?.length > 0 && <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded-full">{((analysis.gdpr as any).vatNumbers as string[]).join(', ')}</span>}
                    </div>
                  </div>
                )}

                {/* Opportunità/Servizi Consigliati */}
                {(analysis as any).opportunities && (
                  <div className="bg-white dark:bg-gray-800 rounded-xl p-6">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                      <Zap className="h-5 w-5 mr-2 text-yellow-500" />
                      Servizi Consigliati per il Lead
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {(analysis as any).opportunities.neededServices?.map((service:string, idx:number) => (
                        <span key={idx} className="px-3 py-1 bg-yellow-100 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-300 rounded-full text-sm">
                          {service}
                        </span>
                      ))}
                      {(analysis as any).opportunities.quickWins?.map((qw:string, idx:number) => (
                        <span key={idx} className="px-3 py-1 bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-300 rounded-full text-sm">
                          {qw}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* SEO Analysis */}
                {(isNewFormat() ? analysis.seo : analysis) && (
                  <div className="bg-white dark:bg-gray-800 rounded-xl p-6">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                      <Search className="h-5 w-5 mr-2 text-blue-500" />
                      Analisi SEO
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {isNewFormat() ? (
                        <>
                          <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                            <span className="text-sm text-gray-700 dark:text-gray-300">
                              Title Tag
                            </span>
                            {analysis.seo.hasTitle ? (
                              <CheckCircle className="h-5 w-5 text-green-500" />
                            ) : (
                              <XCircle className="h-5 w-5 text-red-500" />
                            )}
                          </div>
                          <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                            <span className="text-sm text-gray-700 dark:text-gray-300">
                              Meta Description
                            </span>
                            {analysis.seo.hasMetaDescription ? (
                              <CheckCircle className="h-5 w-5 text-green-500" />
                            ) : (
                              <XCircle className="h-5 w-5 text-red-500" />
                            )}
                          </div>
                          <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                            <span className="text-sm text-gray-700 dark:text-gray-300">
                              Tag H1
                            </span>
                            {analysis.seo.hasH1 ? (
                              <CheckCircle className="h-5 w-5 text-green-500" />
                            ) : (
                              <XCircle className="h-5 w-5 text-red-500" />
                            )}
                          </div>
                          <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                            <span className="text-sm text-gray-700 dark:text-gray-300">
                              Dati Strutturati
                            </span>
                            {analysis.seo.hasStructuredData ? (
                              <CheckCircle className="h-5 w-5 text-green-500" />
                            ) : (
                              <XCircle className="h-5 w-5 text-red-500" />
                            )}
                          </div>
                        </>
                      ) : (
                        // Formato vecchio - LOGICA MIGLIORATA PER LEGACY
                        <>
                          <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                            <span className="text-sm text-gray-700 dark:text-gray-300">
                              Sito Web Attivo
                            </span>
                            {(() => {
                              // LOGICA MIGLIORATA: Se il vecchio analyzer non ha rilevato ma il sito è HTTPS
                              if ((analysis as any).has_website === true) {
                                return (
                                  <CheckCircle className="h-5 w-5 text-green-500" />
                                );
                              }
                              // Se il sito ha HTTPS o altre analisi positive, probabilmente è attivo
                              if (
                                lead.website_url?.startsWith("http://") ||
                                (analysis as any).website_load_time > 0
                              ) {
                                return (
                                  <div className="flex items-center">
                                    <CheckCircle className="h-5 w-5 text-green-500" />
                                    <span className="text-xs text-gray-500 ml-1">
                                      (rilevato URL)
                                    </span>
                                  </div>
                                );
                              }
                              return (
                                <XCircle className="h-5 w-5 text-red-500" />
                              );
                            })()}
                          </div>
                          <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                            <span className="text-sm text-gray-700 dark:text-gray-300">
                              Meta Tags
                            </span>
                            {!(analysis as any).missing_meta_tags ||
                            ((analysis as any).missing_meta_tags as string[]).length === 0 ? (
                              <XCircle className="h-5 w-5 text-red-500" />
                            ) : (
                              <CheckCircle className="h-5 w-5 text-green-500" />
                            )}
                          </div>
                          <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                            <span className="text-sm text-gray-700 dark:text-gray-300">
                              Mobile Friendly
                            </span>
                            {(() => {
                              // LOGICA MIGLIORATA: Se il vecchio analyzer non ha rilevato
                              if ((analysis as any).mobile_friendly === true) {
                                return (
                                  <CheckCircle className="h-5 w-5 text-green-500" />
                                );
                              }
                              // Per lead legacy senza analisi mobile, mostra come "non verificato"
                              return (
                                <div className="flex items-center">
                                  <XCircle className="h-5 w-5 text-gray-400" />
                                  <span className="text-xs text-gray-500 ml-1">
                                    (non verificato)
                                  </span>
                                </div>
                              );
                            })()}
                          </div>
                          <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                            <span className="text-sm text-gray-700 dark:text-gray-300">
                              Certificato SSL
                            </span>
                            {(() => {
                              // LOGICA MIGLIORATA: Se il vecchio analyzer non ha rilevato ma URL è HTTPS
                              if ((analysis as any).ssl_certificate === true) {
                                return (
                                  <CheckCircle className="h-5 w-5 text-green-500" />
                                );
                              }
                              // Se URL è HTTPS, SSL è presente
                              if (lead.website_url?.startsWith("https://")) {
                                return (
                                  <div className="flex items-center">
                                    <CheckCircle className="h-5 w-5 text-green-500" />
                                    <span className="text-xs text-gray-500 ml-1">
                                      (rilevato URL)
                                    </span>
                                  </div>
                                );
                              }
                              return (
                                <XCircle className="h-5 w-5 text-red-500" />
                              );
                            })()}
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                )}

                {/* Tracking & Analytics */}
                {(isNewFormat() ? analysis.tracking : analysis) && (
                  <div className="bg-white dark:bg-gray-800 rounded-xl p-6">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                      <Activity className="h-5 w-5 mr-2 text-purple-500" />
                      Tracking & Analytics
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {isNewFormat() ? (
                        <>
                          <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                            <div className="flex items-center">
                              <span className="text-sm text-gray-700 dark:text-gray-300">
                                Google Analytics
                              </span>
                            </div>
                            {analysis.tracking.hasGoogleAnalytics ? (
                              <CheckCircle className="h-5 w-5 text-green-500" />
                            ) : (
                              <XCircle className="h-5 w-5 text-red-500" />
                            )}
                          </div>
                          <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                            <div className="flex items-center">
                              <Facebook className="h-4 w-4 mr-2 text-blue-600" />
                              <span className="text-sm text-gray-700 dark:text-gray-300">
                                Facebook Pixel
                              </span>
                            </div>
                            {analysis.tracking.hasFacebookPixel ? (
                              <CheckCircle className="h-5 w-5 text-green-500" />
                            ) : (
                              <XCircle className="h-5 w-5 text-red-500" />
                            )}
                          </div>
                          <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                            <span className="text-sm text-gray-700 dark:text-gray-300">
                              Google Tag Manager
                            </span>
                            {analysis.tracking.hasGoogleTagManager ? (
                              <CheckCircle className="h-5 w-5 text-green-500" />
                            ) : (
                              <XCircle className="h-5 w-5 text-red-500" />
                            )}
                          </div>
                          <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                            <span className="text-sm text-gray-700 dark:text-gray-300">
                              Hotjar
                            </span>
                            {analysis.tracking.hasHotjar ? (
                              <CheckCircle className="h-5 w-5 text-green-500" />
                            ) : (
                              <XCircle className="h-5 w-5 text-red-500" />
                            )}
                          </div>
                          {((analysis.tracking as any).customTracking || (analysis.tracking as any).customPixels) &&
                            (((analysis.tracking as any).customTracking as string[])?.length > 0 || ((analysis.tracking as any).customPixels as string[])?.length > 0) && (
                              <div className="md:col-span-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                  Altri Tracking:{" "}
                                  {(((analysis.tracking as any).customTracking as string[]) || ((analysis.tracking as any).customPixels as string[])).join(", ")}
                                </span>
                              </div>
                            )}
                        </>
                      ) : (
                        // Formato vecchio
                        <>
                          <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                            <span className="text-sm text-gray-700 dark:text-gray-300">
                              Pixel Tracking
                            </span>
                            {(analysis as any).has_tracking_pixel ? (
                              <CheckCircle className="h-5 w-5 text-green-500" />
                            ) : (
                              <XCircle className="h-5 w-5 text-red-500" />
                            )}
                          </div>
                          <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                            <span className="text-sm text-gray-700 dark:text-gray-300">
                              Google Tag Manager
                            </span>
                            {(analysis as any).gtm_installed ? (
                              <CheckCircle className="h-5 w-5 text-green-500" />
                            ) : (
                              <XCircle className="h-5 w-5 text-red-500" />
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                )}

                {/* GDPR Compliance */}
                {isNewFormat() && analysis.gdpr && (
                  <div className="bg-white dark:bg-gray-800 rounded-xl p-6">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                      <Shield className="h-5 w-5 mr-2 text-green-600" />
                      Conformità GDPR
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                        <span className="text-sm text-gray-700 dark:text-gray-300">
                          Cookie Banner
                        </span>
                        {analysis.gdpr.hasCookieBanner ? (
                          <CheckCircle className="h-5 w-5 text-green-500" />
                        ) : (
                          <XCircle className="h-5 w-5 text-red-500" />
                        )}
                      </div>
                      <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                        <span className="text-sm text-gray-700 dark:text-gray-300">
                          Privacy Policy
                        </span>
                        {analysis.gdpr.hasPrivacyPolicy ? (
                          <CheckCircle className="h-5 w-5 text-green-500" />
                        ) : (
                          <XCircle className="h-5 w-5 text-red-500" />
                        )}
                      </div>
                      <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                        <span className="text-sm text-gray-700 dark:text-gray-300">
                          Termini di Servizio
                        </span>
                        {analysis.gdpr.hasTermsOfService ? (
                          <CheckCircle className="h-5 w-5 text-green-500" />
                        ) : (
                          <XCircle className="h-5 w-5 text-red-500" />
                        )}
                      </div>
                      {((analysis.gdpr as any).riskyEmbeds as string[]) &&
                        ((analysis.gdpr as any).riskyEmbeds as string[]).length > 0 && (
                          <div className="flex items-center justify-between p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                            <span className="text-sm text-gray-700 dark:text-gray-300">
                              Embed Rischiosi
                            </span>
                            <AlertTriangle className="h-5 w-5 text-red-500" />
                          </div>
                        )}
                    </div>
                  </div>
                )}

                {/* Social Presence */}
                {isNewFormat() && analysis.social && (
                  <div className="bg-white dark:bg-gray-800 rounded-xl p-6">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                      <Eye className="h-5 w-5 mr-2 text-pink-500" />
                      Presenza Social
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {(((analysis.social as any).facebook) || ((analysis.social as any).platforms?.facebook)) && (
                        <a
                          href={((analysis.social as any).facebook) || ((analysis.social as any).platforms?.facebook)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors group"
                        >
                          <div className="flex items-center">
                            <Facebook className="h-5 w-5 text-blue-600 mr-2" />
                            <span className="text-sm text-gray-700 dark:text-gray-300">
                              Facebook
                            </span>
                          </div>
                          <ExternalLink className="h-4 w-4 text-gray-400 group-hover:text-blue-600" />
                        </a>
                      )}
                      {(((analysis.social as any).instagram) || ((analysis.social as any).platforms?.instagram)) && (
                        <a
                          href={((analysis.social as any).instagram) || ((analysis.social as any).platforms?.instagram)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center justify-between p-3 bg-pink-50 dark:bg-pink-900/20 rounded-lg hover:bg-pink-100 dark:hover:bg-pink-900/30 transition-colors group"
                        >
                          <div className="flex items-center">
                            <Instagram className="h-5 w-5 text-pink-600 mr-2" />
                            <span className="text-sm text-gray-700 dark:text-gray-300">
                              Instagram
                            </span>
                          </div>
                          <ExternalLink className="h-4 w-4 text-gray-400 group-hover:text-pink-600" />
                        </a>
                      )}
                      {(((analysis.social as any).linkedin) || ((analysis.social as any).platforms?.linkedin)) && (
                        <a
                          href={((analysis.social as any).linkedin) || ((analysis.social as any).platforms?.linkedin)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors group"
                        >
                          <div className="flex items-center">
                            <Linkedin className="h-5 w-5 text-blue-700 mr-2" />
                            <span className="text-sm text-gray-700 dark:text-gray-300">
                              LinkedIn
                            </span>
                          </div>
                          <ExternalLink className="h-4 w-4 text-gray-400 group-hover:text-blue-700" />
                        </a>
                      )}
                      {(((analysis.social as any).twitter) || ((analysis.social as any).platforms?.twitter)) && (
                        <a
                          href={((analysis.social as any).twitter) || ((analysis.social as any).platforms?.twitter)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors group"
                        >
                          <div className="flex items-center">
                            <Twitter className="h-5 w-5 text-blue-500 mr-2" />
                            <span className="text-sm text-gray-700 dark:text-gray-300">
                              Twitter
                            </span>
                          </div>
                          <ExternalLink className="h-4 w-4 text-gray-400 group-hover:text-blue-500" />
                        </a>
                      )}
                      {(((analysis.social as any).youtube) || ((analysis.social as any).platforms?.youtube)) && (
                        <a
                          href={((analysis.social as any).youtube) || ((analysis.social as any).platforms?.youtube)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center justify-between p-3 bg-red-50 dark:bg-red-900/20 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors group"
                        >
                          <div className="flex items-center">
                            <Youtube className="h-5 w-5 text-red-600 mr-2" />
                            <span className="text-sm text-gray-700 dark:text-gray-300">
                              YouTube
                            </span>
                          </div>
                          <ExternalLink className="h-4 w-4 text-gray-400 group-hover:text-red-600" />
                        </a>
                      )}
                      {!analysis.social.hasAnySocial && (
                        <div className="col-span-full text-center p-4 text-gray-500 dark:text-gray-400">
                          Nessuna presenza social rilevata
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Tracking & Analytics - Legacy Format */}
                {!isNewFormat() &&
                  ((analysis as any).has_tracking_pixel !== undefined ||
                    (analysis as any).gtm_installed !== undefined) && (
                    <div className="bg-white dark:bg-gray-800 rounded-xl p-6">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                        <BarChart3 className="h-5 w-5 mr-2 text-purple-500" />
                        Tracking & Analytics
                      </h3>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {(analysis as any).has_tracking_pixel !== undefined && (
                          <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                            <div className="flex items-center">
                              <div className="w-2 h-2 rounded-full bg-blue-500 mr-2"></div>
                              <span className="text-sm text-gray-700 dark:text-gray-300">
                                Pixel Tracking
                              </span>
                            </div>
                            {(analysis as any).has_tracking_pixel === true ? (
                              <CheckCircle className="h-5 w-5 text-green-500" />
                            ) : (
                              <XCircle className="h-5 w-5 text-red-500" />
                            )}
                          </div>
                        )}

                        {(analysis as any).gtm_installed !== undefined && (
                          <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                            <div className="flex items-center">
                              <div className="w-2 h-2 rounded-full bg-green-500 mr-2"></div>
                              <span className="text-sm text-gray-700 dark:text-gray-300">
                                Google Tag Manager
                              </span>
                            </div>
                            {(analysis as any).gtm_installed === true ? (
                              <CheckCircle className="h-5 w-5 text-green-500" />
                            ) : (
                              <XCircle className="h-5 w-5 text-red-500" />
                            )}
                          </div>
                        )}

                        {(analysis as any).has_tracking_pixel === false &&
                          (analysis as any).gtm_installed === false && (
                            <div className="col-span-full text-center p-4 text-gray-500 dark:text-gray-400">
                              Nessun sistema di tracking rilevato
                            </div>
                          )}
                      </div>
                    </div>
                  )}

                {/* Performance Details */}
                {(isNewFormat() ? analysis.performance : analysis) && (
                  <div className="bg-white dark:bg-gray-800 rounded-xl p-6">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                      <Zap className="h-5 w-5 mr-2 text-yellow-500" />
                      Performance Dettagliate
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {/* Core Web Vitals */}
                      <div className="md:col-span-3 mb-4">
                        <h4 className="text-md font-medium text-gray-900 dark:text-white mb-3">Core Web Vitals</h4>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                          <div className="text-center p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                            <div className={`text-xl font-bold ${getPerformanceScore() >= 80 ? 'text-green-600' : getPerformanceScore() >= 60 ? 'text-yellow-600' : 'text-red-600'}`}>
                              {getPerformanceScore()}
                            </div>
                            <div className="text-xs text-gray-600 dark:text-gray-400">Speed Score</div>
                          </div>
                          <div className="text-center p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                            <div className="text-xl font-bold text-blue-600">
                              {(() => {
                                const perf = (analysis as any).performance;
                                if (perf?.fcp) return Math.round(perf.fcp);
                                if (perf?.domContentLoaded) return Math.round(perf.domContentLoaded);
                                if (perf?.coreWebVitals?.fcp) return Math.round(perf.coreWebVitals.fcp);
                                return "N/A";
                              })()}
                              {(() => {
                                const perf = (analysis as any).performance;
                                return (perf?.fcp || perf?.domContentLoaded || perf?.coreWebVitals?.fcp) ? "ms" : "";
                              })()}
                            </div>
                            <div className="text-xs text-gray-600 dark:text-gray-400">First Contentful Paint</div>
                          </div>
                          <div className="text-center p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                            <div className="text-xl font-bold text-purple-600">
                              {(() => {
                                const perf = (analysis as any).performance;
                                if (perf?.lcp) return Math.round(perf.lcp);
                                if (perf?.coreWebVitals?.lcp) return Math.round(perf.coreWebVitals.lcp);
                                return "N/A";
                              })()}
                              {(() => {
                                const perf = (analysis as any).performance;
                                return (perf?.lcp || perf?.coreWebVitals?.lcp) ? "ms" : "";
                              })()}
                            </div>
                            <div className="text-xs text-gray-600 dark:text-gray-400">Largest Contentful Paint</div>
                          </div>
                          <div className="text-center p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                            <div className="text-xl font-bold text-orange-600">
                              {(() => {
                                const perf = (analysis as any).performance;
                                if (perf?.cls !== null && perf?.cls !== undefined) return perf.cls.toFixed(3);
                                if (perf?.coreWebVitals?.cls !== null && perf?.coreWebVitals?.cls !== undefined) return perf.coreWebVitals.cls.toFixed(3);
                                return "N/A";
                              })()}
                            </div>
                            <div className="text-xs text-gray-600 dark:text-gray-400">Cumulative Layout Shift</div>
                          </div>
                        </div>
                      </div>

                      {/* Tempi di Caricamento */}
                      <div className="md:col-span-3 mb-4">
                        <h4 className="text-md font-medium text-gray-900 dark:text-white mb-3">Tempi di Caricamento</h4>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                            <span className="text-sm text-gray-700 dark:text-gray-300">TTFB</span>
                            <span className="text-sm font-medium dark:text-gray-300">
                              {(() => {
                                const perf = (analysis as any).performance;
                                if (perf?.ttfb) return Math.round(perf.ttfb) + "ms";
                                return "N/A";
                              })()}
                            </span>
                          </div>
                          <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                            <span className="text-sm text-gray-700 dark:text-gray-300">DOM Content Loaded</span>
                            <span className="text-sm font-medium dark:text-gray-300">
                              {(() => {
                                const perf = (analysis as any).performance;
                                if (perf?.domContentLoaded) return Math.round(perf.domContentLoaded) + "ms";
                                return "N/A";
                              })()}
                            </span>
                          </div>
                          <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                            <span className="text-sm text-gray-700 dark:text-gray-300">Caricamento Completo</span>
                            <span className="text-sm font-medium dark:text-gray-300">
                              {(() => {
                                const perf = (analysis as any).performance;
                                if (perf?.loadComplete) return Math.round(perf.loadComplete) + "ms";
                                const loadTime = (analysis as any).website_load_time !== undefined 
                                  ? (analysis as any).website_load_time
                                  : analysis.performance?.loadTime;
                                return loadTime ? Math.round(loadTime) + "ms" : "N/A";
                              })()}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Risorse e Dimensioni */}
                      <div className="md:col-span-3 mb-4">
                        <h4 className="text-md font-medium text-gray-900 dark:text-white mb-3">Risorse e Dimensioni</h4>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                          <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                            <span className="text-sm text-gray-700 dark:text-gray-300">Richieste Totali</span>
                            <span className="text-sm font-medium dark:text-gray-300">
                              {(() => {
                                const perf = (analysis as any).performance;
                                return perf?.requestCount || perf?.totalResources || "N/A";
                              })()}
                            </span>
                          </div>
                          <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                            <span className="text-sm text-gray-700 dark:text-gray-300">Dimensione Totale</span>
                            <span className="text-sm font-medium dark:text-gray-300">
                              {(() => {
                                const perf = (analysis as any).performance;
                                if (perf?.totalSize) return Math.round(perf.totalSize / 1024) + " KB";
                                return "N/A";
                              })()}
                            </span>
                          </div>
                          <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                            <span className="text-sm text-gray-700 dark:text-gray-300">JS Size</span>
                            <span className="text-sm font-medium dark:text-gray-300">
                              {(() => {
                                const perf = (analysis as any).performance;
                                if (perf?.jsSize) return Math.round(perf.jsSize / 1024) + " KB";
                                return "N/A";
                              })()}
                            </span>
                          </div>
                          <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                            <span className="text-sm text-gray-700 dark:text-gray-300">CSS Size</span>
                            <span className="text-sm font-medium dark:text-gray-300">
                              {(() => {
                                const perf = (analysis as any).performance;
                                if (perf?.cssSize) return Math.round(perf.cssSize / 1024) + " KB";
                                return "N/A";
                              })()}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Mobile Performance */}
                      <div className="md:col-span-3">
                        <h4 className="text-md font-medium text-gray-900 dark:text-white mb-3">Mobile Performance</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                            <span className="text-sm text-gray-700 dark:text-gray-300">Mobile Score</span>
                            <span className={`text-sm font-medium ${(() => {
                              const score = (analysis as any).performance?.mobileScore || 
                                           (analysis as any).mobile?.mobileScore || 
                                           (analysis as any).mobile?.score;
                              if (!score) return 'text-gray-500';
                              return score >= 80 ? 'text-green-600' : score >= 60 ? 'text-yellow-600' : 'text-red-600';
                            })()}`}>
                              {(() => {
                                const score = (analysis as any).performance?.mobileScore || 
                                             (analysis as any).mobile?.mobileScore || 
                                             (analysis as any).mobile?.score;
                                return score || "N/A";
                              })()}
                            </span>
                          </div>
                          <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                            <span className="text-sm text-gray-700 dark:text-gray-300">Mobile Friendly</span>
                            {(() => {
                              const isMobile = (analysis as any).mobile?.isMobileFriendly || 
                                              (analysis as any).performance?.isResponsive || 
                                              (analysis as any).mobile_friendly;
                              if (isMobile === true) {
                                return <CheckCircle className="h-5 w-5 text-green-500" />;
                              } else if (isMobile === false) {
                                return <XCircle className="h-5 w-5 text-red-500" />;
                              } else {
                                return (
                                  <div className="flex items-center">
                                    <XCircle className="h-5 w-5 text-gray-400" />
                                    <span className="text-xs text-gray-500 ml-1">(non verificato)</span>
                                  </div>
                                );
                              }
                            })()}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Meta Tags Mancanti (solo formato vecchio) */}
                {!isNewFormat() &&
                  (analysis as any).missing_meta_tags &&
                  ((analysis as any).missing_meta_tags as string[]).length > 0 && (
                    <div className="bg-white dark:bg-gray-800 rounded-xl p-6">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                        Meta Tags Mancanti
                      </h3>

                      <div className="space-y-2">
                        {((analysis as any).missing_meta_tags as string[]).map(
                          (tag: string, index: number) => (
                            <div key={index} className="flex items-center">
                              <AlertTriangle className="h-4 w-4 text-orange-500 mr-2" />
                              <code className="bg-gray-100 dark:bg-gray-900 px-2 py-1 rounded text-sm">
                                {tag}
                              </code>
                            </div>
                          )
                        )}
                      </div>
                    </div>
                  )}
              </>
            )}

            {/* Grafici e Visualizzazioni Avanzate */}
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6 flex items-center">
                <BarChart3 className="h-5 w-5 mr-2 text-blue-500" />
                Dashboard Analytics Completa
              </h3>

              {/* Prima riga - Metriche principali */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                <div className="text-center p-6 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-xl">
                  <div className="flex justify-center mb-3">
                    <Search className="h-8 w-8 text-blue-600" />
                  </div>
                  <div className={`text-3xl font-bold mb-2 ${getScoreColor(getSEOScore())}`}>
                    {getSEOScore()}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">SEO Score</div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${getSEOScore() >= 80 ? "bg-green-500" : getSEOScore() >= 60 ? "bg-yellow-500" : "bg-red-500"}`}
                      style={{ width: `${getSEOScore()}%` }}
                    ></div>
                  </div>
                </div>

                <div className="text-center p-6 bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 rounded-xl">
                  <div className="flex justify-center mb-3">
                    <Zap className="h-8 w-8 text-purple-600" />
                  </div>
                  <div className={`text-3xl font-bold mb-2 ${getScoreColor(getPerformanceScore())}`}>
                    {getPerformanceScore()}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">Performance</div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${getPerformanceScore() >= 80 ? "bg-green-500" : getPerformanceScore() >= 60 ? "bg-yellow-500" : "bg-red-500"}`}
                      style={{ width: `${getPerformanceScore()}%` }}
                    ></div>
                  </div>
                </div>

                <div className="text-center p-6 bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 rounded-xl">
                  <div className="flex justify-center mb-3">
                    <TrendingUp className="h-8 w-8 text-green-600" />
                  </div>
                  <div className={`text-3xl font-bold mb-2 ${getScoreColor(getOverallScore())}`}>
                    {getOverallScore()}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">Overall Score</div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${getOverallScore() >= 80 ? "bg-green-500" : getOverallScore() >= 60 ? "bg-yellow-500" : "bg-red-500"}`}
                      style={{ width: `${getOverallScore()}%` }}
                    ></div>
                  </div>
                </div>

                <div className="text-center p-6 bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20 rounded-xl">
                  <div className="flex justify-center mb-3">
                    <Star className="h-8 w-8 text-orange-600" />
                  </div>
                  <div className="text-3xl font-bold mb-2 text-orange-600">
                    {(() => {
                      const score = (analysis as any)?.businessValue || (analysis as any)?.technicalHealth || lead?.score || 0;
                      return Math.min(100, Math.max(0, score));
                    })()}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">Business Value</div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div
                      className="h-2 rounded-full bg-orange-500"
                      style={{ width: `${Math.min(100, Math.max(0, (analysis as any)?.businessValue || (analysis as any)?.technicalHealth || lead?.score || 0))}%` }}
                    ></div>
                  </div>
                </div>
              </div>

              {/* Seconda riga - Analytics dettagliate */}
              {analysis && (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                    {/* Grafico Performance Details */}
                    <div className="p-6 bg-gradient-to-br from-gray-50 to-blue-50 dark:from-gray-900/50 dark:to-blue-900/20 rounded-xl">
                      <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-4 flex items-center">
                        <Zap className="h-5 w-5 mr-2 text-yellow-500" />
                        Metriche Performance
                      </h4>
                      <div className="space-y-4">
                        {/* Core Web Vitals */}
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600 dark:text-gray-400">Load Time</span>
                          <div className="flex items-center">
                            <div className="w-32 bg-gray-200 dark:bg-gray-700 rounded-full h-2 mr-3">
                              <div
                                className={`h-2 rounded-full ${(() => {
                                  const loadTime = (analysis as any).performance?.loadTime || (analysis as any).performance?.loadComplete || (analysis as any).website_load_time || 0;
                                  return loadTime > 3000 ? "bg-red-500" : loadTime > 2000 ? "bg-yellow-500" : "bg-green-500";
                                })()}`}
                                style={{ 
                                  width: `${Math.min(100, Math.max(10, 100 - ((((analysis as any).performance?.loadTime || (analysis as any).performance?.loadComplete || (analysis as any).website_load_time || 0) / 5000) * 100)))}%` 
                                }}
                              ></div>
                            </div>
                            <span className="text-sm font-medium">
                              {(() => {
                                const loadTime = (analysis as any).performance?.loadTime || (analysis as any).performance?.loadComplete || (analysis as any).website_load_time;
                                return loadTime ? `${Math.round(loadTime)}ms` : "N/A";
                              })()}
                            </span>
                          </div>
                        </div>

                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600 dark:text-gray-400">Mobile Score</span>
                          <div className="flex items-center">
                            <div className="w-32 bg-gray-200 dark:bg-gray-700 rounded-full h-2 mr-3">
                              <div
                                className={`h-2 rounded-full ${(() => {
                                  const score = (analysis as any).performance?.mobileScore || (analysis as any).mobile?.mobileScore || 0;
                                  return score >= 80 ? "bg-green-500" : score >= 60 ? "bg-yellow-500" : "bg-red-500";
                                })()}`}
                                style={{ width: `${(analysis as any).performance?.mobileScore || (analysis as any).mobile?.mobileScore || 0}%` }}
                              ></div>
                            </div>
                            <span className="text-sm font-medium">
                              {(analysis as any).performance?.mobileScore || (analysis as any).mobile?.mobileScore || "N/A"}
                            </span>
                          </div>
                        </div>

                        {(analysis as any).performance?.cls !== undefined && (
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-gray-600 dark:text-gray-400">CLS</span>
                            <div className="flex items-center">
                              <div className="w-32 bg-gray-200 dark:bg-gray-700 rounded-full h-2 mr-3">
                                <div
                                  className={`h-2 rounded-full ${(analysis as any).performance.cls > 0.1 ? "bg-red-500" : (analysis as any).performance.cls > 0.05 ? "bg-yellow-500" : "bg-green-500"}`}
                                  style={{ width: `${Math.max(10, 100 - ((analysis as any).performance.cls * 1000))}%` }}
                                ></div>
                              </div>
                              <span className="text-sm font-medium">
                                {(analysis as any).performance.cls?.toFixed(3) || "N/A"}
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Contatti e Social Stats */}
                    <div className="p-6 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-xl">
                      <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-4 flex items-center">
                        <Users className="h-5 w-5 mr-2 text-purple-500" />
                        Contatti & Social
                      </h4>
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center">
                            <Phone className="h-4 w-4 text-green-500 mr-2" />
                            <span className="text-sm text-gray-600 dark:text-gray-400">Telefoni</span>
                          </div>
                          <div className="flex items-center">
                            <div className="w-20 bg-gray-200 dark:bg-gray-700 rounded-full h-2 mr-2">
                              <div
                                className="h-2 rounded-full bg-green-500"
                                style={{ width: `${Math.min(100, ((analysis as any).content?.phoneNumbers?.length || 0) * 20)}%` }}
                              ></div>
                            </div>
                            <span className="text-sm font-bold text-green-600">
                              {(analysis as any).content?.phoneNumbers?.length || 0}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between">
                          <div className="flex items-center">
                            <Mail className="h-4 w-4 text-blue-500 mr-2" />
                            <span className="text-sm text-gray-600 dark:text-gray-400">Email</span>
                          </div>
                          <div className="flex items-center">
                            <div className="w-20 bg-gray-200 dark:bg-gray-700 rounded-full h-2 mr-2">
                              <div
                                className="h-2 rounded-full bg-blue-500"
                                style={{ width: `${Math.min(100, ((analysis as any).content?.emailAddresses?.length || 0) * 25)}%` }}
                              ></div>
                            </div>
                            <span className="text-sm font-bold text-blue-600">
                              {(analysis as any).content?.emailAddresses?.length || 0}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between">
                          <div className="flex items-center">
                            <Activity className="h-4 w-4 text-purple-500 mr-2" />
                            <span className="text-sm text-gray-600 dark:text-gray-400">Social</span>
                          </div>
                          <div className="flex items-center">
                            <div className="w-20 bg-gray-200 dark:bg-gray-700 rounded-full h-2 mr-2">
                              <div
                                className="h-2 rounded-full bg-purple-500"
                                style={{ width: `${Math.min(100, ((analysis as any).social?.profiles?.filter((p: any) => p.found)?.length || 0) * 15)}%` }}
                              ></div>
                            </div>
                            <span className="text-sm font-bold text-purple-600">
                              {(analysis as any).social?.profiles?.filter((p: any) => p.found)?.length || 0}
                            </span>
                          </div>
                        </div>

                        {(analysis as any).content?.contentQualityScore && (
                          <div className="flex items-center justify-between">
                            <div className="flex items-center">
                              <Star className="h-4 w-4 text-yellow-500 mr-2" />
                              <span className="text-sm text-gray-600 dark:text-gray-400">Qualità</span>
                            </div>
                            <div className="flex items-center">
                              <div className="w-20 bg-gray-200 dark:bg-gray-700 rounded-full h-2 mr-2">
                                <div
                                  className="h-2 rounded-full bg-yellow-500"
                                  style={{ width: `${(analysis as any).content.contentQualityScore}%` }}
                                ></div>
                              </div>
                              <span className="text-sm font-bold text-yellow-600">
                                {(analysis as any).content.contentQualityScore}
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Terza riga - Riepilogo Problemi */}
                  <div className="p-6 bg-gradient-to-r from-red-50 via-yellow-50 to-green-50 dark:from-red-900/20 dark:via-yellow-900/20 dark:to-green-900/20 rounded-xl">
                    <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-4 flex items-center">
                      <AlertTriangle className="h-5 w-5 mr-2 text-orange-500" />
                      Riepilogo Opportunità di Business
                    </h4>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      {/* Problemi Critici */}
                      <div className="text-center">
                        <div className="text-2xl font-bold text-red-600 mb-2">
                          {(() => {
                            const recs = generateRecommendations();
                            return recs.filter(r => r.priority === 'high').length;
                          })()}
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-400 mb-3">Priorità Alta</div>
                        <div className="space-y-1">
                          {generateRecommendations()
                            .filter(r => r.priority === 'high')
                            .slice(0, 3)
                            .map((rec, idx) => (
                              <div key={idx} className="text-xs bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-300 px-2 py-1 rounded">
                                {rec.title}
                              </div>
                            ))}
                        </div>
                      </div>

                      {/* Problemi Medi */}
                      <div className="text-center">
                        <div className="text-2xl font-bold text-yellow-600 mb-2">
                          {(() => {
                            const recs = generateRecommendations();
                            return recs.filter(r => r.priority === 'medium').length;
                          })()}
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-400 mb-3">Priorità Media</div>
                        <div className="space-y-1">
                          {generateRecommendations()
                            .filter(r => r.priority === 'medium')
                            .slice(0, 3)
                            .map((rec, idx) => (
                              <div key={idx} className="text-xs bg-yellow-100 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-300 px-2 py-1 rounded">
                                {rec.title}
                              </div>
                            ))}
                        </div>
                      </div>

                      {/* Aspetti Positivi */}
                      <div className="text-center">
                        <div className="text-2xl font-bold text-green-600 mb-2">
                          {(() => {
                            let positives = 0;
                            if (getSEOScore() >= 70) positives++;
                            if (getPerformanceScore() >= 70) positives++;
                            if ((analysis as any).content?.phoneNumbers?.length > 0) positives++;
                            if ((analysis as any).content?.emailAddresses?.length > 0) positives++;
                            if ((analysis as any).social?.profiles?.some((p: any) => p.found)) positives++;
                            return positives;
                          })()}
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-400 mb-3">Punti di Forza</div>
                        <div className="space-y-1">
                          {getSEOScore() >= 70 && (
                            <div className="text-xs bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-300 px-2 py-1 rounded">
                              SEO Ottimizzato
                            </div>
                          )}
                          {getPerformanceScore() >= 70 && (
                            <div className="text-xs bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-300 px-2 py-1 rounded">
                              Performance Buone
                            </div>
                          )}
                          {(analysis as any).content?.phoneNumbers?.length > 0 && (
                            <div className="text-xs bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-300 px-2 py-1 rounded">
                              Contatti Disponibili
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Business Value Indicator */}
                    <div className="mt-6 p-4 bg-white dark:bg-gray-800 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-900 dark:text-white">Potenziale di Vendita</span>
                        <span className="text-sm font-bold text-purple-600">
                          {(() => {
                            const totalRecs = generateRecommendations().length;
                            const highPriority = generateRecommendations().filter(r => r.priority === 'high').length;
                            const score = Math.min(100, (totalRecs * 10) + (highPriority * 15));
                            return `${score}%`;
                          })()}
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                        <div
                          className="h-3 rounded-full bg-gradient-to-r from-purple-500 to-pink-500"
                          style={{ 
                            width: `${Math.min(100, (generateRecommendations().length * 10) + (generateRecommendations().filter(r => r.priority === 'high').length * 15))}%` 
                          }}
                        ></div>
                      </div>
                      <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                        Basato su {generateRecommendations().length} opportunità identificate
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Grafici e Visualizzazioni */}
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Visualizzazione Punteggi
              </h3>

              <div className="space-y-4">
                {/* Barra di progresso per ogni metrica */}
                {analysis && (
                  <>
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-700 dark:text-gray-300">
                          SEO
                        </span>
                        <span className={getScoreColor(getSEOScore())}>
                          {getSEOScore()}/100
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full ${
                            getSEOScore() >= 80
                              ? "bg-green-500"
                              : getSEOScore() >= 60
                              ? "bg-yellow-500"
                              : getSEOScore() >= 40
                              ? "bg-orange-500"
                              : "bg-red-500"
                          }`}
                          style={{ width: `${getSEOScore()}%` }}
                        ></div>
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-700 dark:text-gray-300">
                          Performance
                        </span>
                        <span className={getScoreColor(getPerformanceScore())}>
                          {getPerformanceScore()}/100
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full ${
                            getPerformanceScore() >= 80
                              ? "bg-green-500"
                              : getPerformanceScore() >= 60
                              ? "bg-yellow-500"
                              : getPerformanceScore() >= 40
                              ? "bg-orange-500"
                              : "bg-red-500"
                          }`}
                          style={{ width: `${getPerformanceScore()}%` }}
                        ></div>
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-700 dark:text-gray-300">
                          Punteggio Complessivo
                        </span>
                        <span className={getScoreColor(getOverallScore())}>
                          {getOverallScore()}/100
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full ${
                            getOverallScore() >= 80
                              ? "bg-green-500"
                              : getOverallScore() >= 60
                              ? "bg-yellow-500"
                              : getOverallScore() >= 40
                              ? "bg-orange-500"
                              : "bg-red-500"
                          }`}
                          style={{ width: `${getOverallScore()}%` }}
                        ></div>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Sezione Servizi Digitali per utenti PRO */}
            <LeadDigitalServices lead={lead} />

            {/* Riepilogo Finale */}
            <div className="bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                💡 Riepilogo Raccomandazioni
              </h3>

              <div className="space-y-3">
                {analysis && (
                  <>
                    {/* SEO Issues */}
                    {((isNewFormat() &&
                      (!analysis.seo?.hasTitle ||
                        !analysis.seo?.hasMetaDescription ||
                        !analysis.seo?.hasH1)) ||
                      (!isNewFormat() &&
                        (analysis as any).missing_meta_tags &&
                        ((analysis as any).missing_meta_tags as string[]).length > 0)) && (
                      <div className="flex items-start">
                        <Zap className="h-5 w-5 text-blue-500 mr-2 mt-0.5" />
                        <span className="text-sm text-gray-700 dark:text-gray-300">
                          <strong>SEO:</strong> Ottimizzare i meta tag (title,
                          description, H1) per migliorare la visibilità sui
                          motori di ricerca
                        </span>
                      </div>
                    )}

                    {/* Tracking Issues */}
                    {((isNewFormat() &&
                      !analysis.tracking?.hasGoogleAnalytics &&
                      !analysis.tracking?.hasFacebookPixel) ||
                      (!isNewFormat() &&
                        (analysis as any).has_tracking_pixel === false)) && (
                      <div className="flex items-start">
                        <Zap className="h-5 w-5 text-blue-500 mr-2 mt-0.5" />
                        <span className="text-sm text-gray-700 dark:text-gray-300">
                          <strong>Analytics:</strong> Installare Google
                          Analytics e Facebook Pixel per monitorare le
                          conversioni
                        </span>
                      </div>
                    )}

                    {/* Performance Issues */}
                    {getPerformanceScore() < 70 && (
                      <div className="flex items-start">
                        <Zap className="h-5 w-5 text-blue-500 mr-2 mt-0.5" />
                        <span className="text-sm text-gray-700 dark:text-gray-300">
                          <strong>Performance:</strong> Ottimizzare la velocità
                          di caricamento per migliorare l'esperienza utente
                        </span>
                      </div>
                    )}

                    {/* Mobile Issues */}
                    {((isNewFormat() &&
                      (analysis.performance as any)?.isResponsive === false) ||
                      (!isNewFormat() &&
                        (analysis as any).mobile_friendly === false)) && (
                      <div className="flex items-start">
                        <Smartphone className="h-5 w-5 text-blue-500 mr-2 mt-0.5" />
                        <span className="text-sm text-gray-700 dark:text-gray-300">
                          <strong>Mobile:</strong> Rendere il sito responsive
                          per migliorare l'esperienza su dispositivi mobili
                        </span>
                      </div>
                    )}
                  </>
                )}

                {!analysis && (
                  <div className="text-center py-8">
                    <Activity className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-600 dark:text-gray-400">
                      Nessuna analisi disponibile
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
