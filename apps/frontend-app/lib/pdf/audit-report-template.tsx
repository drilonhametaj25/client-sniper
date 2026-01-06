/**
 * Audit Report PDF Template using @react-pdf/renderer
 */
import React from 'react'
import { Document, Page, Text, View, Image } from '@react-pdf/renderer'
import { styles, colors, getScoreColor, getSeverityColor } from './pdf-styles'
import { AuditReportData, BrandingConfig, defaultBranding } from '../types/pdf'

// Helper component for score cards
const ScoreCard = ({ label, score, large = false }: { label: string; score: number; large?: boolean }) => {
  const scoreColor = getScoreColor(score)

  return (
    <View style={large ? styles.scoreCardLarge : styles.scoreCard}>
      <Text style={[large ? styles.scoreValueLarge : styles.scoreValue, { color: scoreColor }]}>
        {score}
      </Text>
      <Text style={large ? styles.scoreLabelLarge : styles.scoreLabel}>{label}</Text>
    </View>
  )
}

// Helper component for checklist items
const ChecklistItem = ({ label, passed }: { label: string; passed: boolean }) => (
  <View style={styles.checklistItem}>
    <View style={[styles.checkIcon, passed ? styles.checkIconPass : styles.checkIconFail]}>
      <Text style={{ color: colors.white, fontSize: 10 }}>{passed ? '✓' : '✗'}</Text>
    </View>
    <Text style={styles.checkText}>{label}</Text>
  </View>
)

// Helper component for issue cards
const IssueCard = ({ severity, title, description, recommendation }: {
  severity: 'critical' | 'high' | 'medium' | 'low'
  title: string
  description: string
  recommendation?: string
}) => {
  const borderColor = getSeverityColor(severity)
  const badgeStyle = severity === 'critical' ? styles.badgeCritical
    : severity === 'high' ? styles.badgeHigh
    : severity === 'medium' ? styles.badgeMedium
    : styles.badgeLow

  return (
    <View style={[styles.issueCard, { borderLeftColor: borderColor }]}>
      <View style={styles.flexBetween}>
        <Text style={styles.issueTitle}>{title}</Text>
        <Text style={[styles.badge, badgeStyle]}>{severity.toUpperCase()}</Text>
      </View>
      <Text style={styles.issueDescription}>{description}</Text>
      {recommendation && (
        <Text style={styles.issueRecommendation}>💡 {recommendation}</Text>
      )}
    </View>
  )
}

// Cover Page Component
const CoverPage = ({ data, branding }: { data: AuditReportData; branding: BrandingConfig }) => (
  <Page size="A4" style={styles.page}>
    <View style={styles.coverPage}>
      {branding.companyLogo && (
        <Image src={branding.companyLogo} style={{ width: 150, height: 50, marginBottom: 40 }} />
      )}
      <Text style={[styles.coverTitle, { color: branding.primaryColor }]}>
        {data.metadata.reportTitle}
      </Text>
      <Text style={styles.coverSubtitle}>
        Analisi completa del sito web
      </Text>

      <View style={{ marginTop: 40, alignItems: 'center' }}>
        <Text style={{ fontSize: 20, fontWeight: 'bold', color: colors.gray800, marginBottom: 10 }}>
          {data.businessInfo.name}
        </Text>
        <Text style={{ fontSize: 14, color: colors.gray500 }}>
          {data.businessInfo.website}
        </Text>
        {data.businessInfo.city && (
          <Text style={{ fontSize: 12, color: colors.gray400, marginTop: 5 }}>
            {data.businessInfo.city} • {data.businessInfo.category}
          </Text>
        )}
      </View>

      <View style={styles.coverMeta}>
        <Text>Report ID: {data.metadata.reportId}</Text>
        <Text style={{ marginTop: 5 }}>
          Data: {new Date(data.metadata.reportDate).toLocaleDateString('it-IT', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          })}
        </Text>
        {data.metadata.preparedBy && (
          <Text style={{ marginTop: 5 }}>Preparato da: {data.metadata.preparedBy}</Text>
        )}
        {data.metadata.preparedFor && (
          <Text style={{ marginTop: 5 }}>Preparato per: {data.metadata.preparedFor}</Text>
        )}
      </View>
    </View>

    <View style={styles.footer}>
      <Text style={styles.footerText}>{branding.footerText || `© ${new Date().getFullYear()} ${branding.companyName}`}</Text>
    </View>
  </Page>
)

// Executive Summary Page
const ExecutiveSummaryPage = ({ data, branding }: { data: AuditReportData; branding: BrandingConfig }) => (
  <Page size="A4" style={styles.page}>
    <View style={styles.header}>
      <View>
        <Text style={styles.headerTitle}>Executive Summary</Text>
        <Text style={styles.headerSubtitle}>Panoramica dei risultati</Text>
      </View>
      {branding.companyLogo && (
        <Image src={branding.companyLogo} style={styles.headerLogo} />
      )}
    </View>

    {/* Overall Score */}
    <View style={styles.section}>
      <ScoreCard label="Punteggio Complessivo" score={data.scores.overall} large />
    </View>

    {/* Category Scores */}
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Punteggi per Categoria</Text>
      <View style={styles.scoreCardsContainer}>
        <ScoreCard label="SEO" score={data.scores.seo} />
        <ScoreCard label="Performance" score={data.scores.performance} />
        <ScoreCard label="Mobile" score={data.scores.mobile} />
        <ScoreCard label="Tracking" score={data.scores.tracking} />
        <ScoreCard label="GDPR" score={data.scores.gdpr} />
        <ScoreCard label="Sicurezza" score={data.scores.security} />
      </View>
    </View>

    {/* Quick Summary */}
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Riepilogo Veloce</Text>
      <View style={styles.table}>
        <View style={styles.tableHeader}>
          <Text style={[styles.tableHeaderCell, { width: '50%' }]}>Metrica</Text>
          <Text style={[styles.tableHeaderCell, { width: '50%' }]}>Stato</Text>
        </View>
        <View style={styles.tableRow}>
          <Text style={[styles.tableCell, { width: '50%' }]}>Problemi Critici</Text>
          <Text style={[styles.tableCell, { width: '50%', color: colors.scoreCritical }]}>
            {data.issues.filter(i => i.severity === 'critical').length}
          </Text>
        </View>
        <View style={styles.tableRowAlt}>
          <Text style={[styles.tableCell, { width: '50%' }]}>Problemi Importanti</Text>
          <Text style={[styles.tableCell, { width: '50%', color: colors.scorePoor }]}>
            {data.issues.filter(i => i.severity === 'high').length}
          </Text>
        </View>
        <View style={styles.tableRow}>
          <Text style={[styles.tableCell, { width: '50%' }]}>Opportunità di Miglioramento</Text>
          <Text style={[styles.tableCell, { width: '50%', color: colors.info }]}>
            {data.opportunities.length}
          </Text>
        </View>
      </View>
    </View>

    <View style={styles.footer}>
      <Text style={styles.footerText}>{branding.companyName}</Text>
      <Text style={styles.pageNumber}>Pagina 2</Text>
    </View>
  </Page>
)

// SEO Analysis Page
const SEOAnalysisPage = ({ data, branding }: { data: AuditReportData; branding: BrandingConfig }) => (
  <Page size="A4" style={styles.page}>
    <View style={styles.header}>
      <View>
        <Text style={styles.headerTitle}>Analisi SEO</Text>
        <Text style={styles.headerSubtitle}>Ottimizzazione per i motori di ricerca</Text>
      </View>
    </View>

    <View style={styles.section}>
      <ScoreCard label="Punteggio SEO" score={data.scores.seo} large />
    </View>

    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Checklist SEO</Text>
      <ChecklistItem
        label={`Tag Title presente ${data.details.seo.hasTitle ? `(${data.details.seo.titleLength} caratteri)` : ''}`}
        passed={data.details.seo.hasTitle}
      />
      <ChecklistItem
        label={`Meta Description presente ${data.details.seo.hasMetaDescription ? `(${data.details.seo.metaDescriptionLength} caratteri)` : ''}`}
        passed={data.details.seo.hasMetaDescription}
      />
      <ChecklistItem
        label={`Tag H1 presente ${data.details.seo.hasH1 ? `(${data.details.seo.h1Count} trovati)` : ''}`}
        passed={data.details.seo.hasH1}
      />
      <ChecklistItem
        label="Dati Strutturati (Schema.org)"
        passed={data.details.seo.hasStructuredData}
      />
    </View>

    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Dettagli</Text>
      <Text style={styles.sectionContent}>
        {data.details.seo.hasTitle
          ? `Il title tag del sito ha ${data.details.seo.titleLength} caratteri. ${data.details.seo.titleLength < 30 ? 'È troppo corto, si consiglia tra 50-60 caratteri.' : data.details.seo.titleLength > 60 ? 'È troppo lungo, potrebbe essere troncato nei risultati di ricerca.' : 'La lunghezza è ottimale.'}`
          : 'Il sito non ha un title tag. Questo è un problema critico per la SEO.'
        }
      </Text>
      <Text style={[styles.sectionContent, { marginTop: 10 }]}>
        {data.details.seo.hasMetaDescription
          ? `La meta description ha ${data.details.seo.metaDescriptionLength} caratteri. ${data.details.seo.metaDescriptionLength < 120 ? 'È troppo corta, si consiglia tra 150-160 caratteri.' : data.details.seo.metaDescriptionLength > 160 ? 'È troppo lunga, potrebbe essere troncata.' : 'La lunghezza è ottimale.'}`
          : 'Il sito non ha una meta description. Questo riduce il CTR nei risultati di ricerca.'
        }
      </Text>
    </View>

    <View style={styles.footer}>
      <Text style={styles.footerText}>{branding.companyName}</Text>
      <Text style={styles.pageNumber}>Pagina 3</Text>
    </View>
  </Page>
)

// Technical Analysis Page
const TechnicalAnalysisPage = ({ data, branding }: { data: AuditReportData; branding: BrandingConfig }) => (
  <Page size="A4" style={styles.page}>
    <View style={styles.header}>
      <View>
        <Text style={styles.headerTitle}>Analisi Tecnica</Text>
        <Text style={styles.headerSubtitle}>Performance, Sicurezza e Mobile</Text>
      </View>
    </View>

    <View style={[styles.section, styles.flexRow]}>
      <View style={{ width: '48%', marginRight: '4%' }}>
        <ScoreCard label="Performance" score={data.scores.performance} />
      </View>
      <View style={{ width: '48%' }}>
        <ScoreCard label="Mobile" score={data.scores.mobile} />
      </View>
    </View>

    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Performance</Text>
      <ChecklistItem
        label={`Tempo di caricamento: ${data.details.performance.loadTime.toFixed(2)}s`}
        passed={data.details.performance.loadTime < 3}
      />
      <ChecklistItem
        label="Design Responsive"
        passed={data.details.performance.isResponsive}
      />
      <ChecklistItem
        label={`Immagini: ${data.details.performance.totalImages} totali, ${data.details.performance.brokenImages} rotte`}
        passed={data.details.performance.brokenImages === 0}
      />
    </View>

    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Sicurezza</Text>
      <ScoreCard label="Sicurezza" score={data.scores.security} />
      <View style={styles.mt15}>
        <ChecklistItem
          label="Certificato SSL attivo"
          passed={data.details.security.hasSSL}
        />
        <ChecklistItem
          label="Nessun problema HTTPS"
          passed={!data.details.security.httpsIssues}
        />
      </View>
    </View>

    <View style={styles.footer}>
      <Text style={styles.footerText}>{branding.companyName}</Text>
      <Text style={styles.pageNumber}>Pagina 4</Text>
    </View>
  </Page>
)

// Tracking & GDPR Page
const TrackingGDPRPage = ({ data, branding }: { data: AuditReportData; branding: BrandingConfig }) => (
  <Page size="A4" style={styles.page}>
    <View style={styles.header}>
      <View>
        <Text style={styles.headerTitle}>Tracking & Privacy</Text>
        <Text style={styles.headerSubtitle}>Analytics e conformità GDPR</Text>
      </View>
    </View>

    <View style={[styles.section, styles.flexRow]}>
      <View style={{ width: '48%', marginRight: '4%' }}>
        <ScoreCard label="Tracking" score={data.scores.tracking} />
      </View>
      <View style={{ width: '48%' }}>
        <ScoreCard label="GDPR" score={data.scores.gdpr} />
      </View>
    </View>

    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Strumenti di Tracking</Text>
      <ChecklistItem label="Google Analytics" passed={data.details.tracking.hasGoogleAnalytics} />
      <ChecklistItem label="Google Tag Manager" passed={data.details.tracking.hasGoogleTagManager} />
      <ChecklistItem label="Facebook Pixel" passed={data.details.tracking.hasFacebookPixel} />
      <ChecklistItem label="Hotjar" passed={data.details.tracking.hasHotjar} />
    </View>

    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Conformità GDPR</Text>
      <ChecklistItem label="Cookie Banner presente" passed={data.details.gdpr.hasCookieBanner} />
      <ChecklistItem label="Privacy Policy presente" passed={data.details.gdpr.hasPrivacyPolicy} />
      <Text style={[styles.sectionContent, { marginTop: 15 }]}>
        {data.details.gdpr.hasCookieBanner && data.details.gdpr.hasPrivacyPolicy
          ? 'Il sito sembra essere conforme alle normative GDPR di base. Si consiglia comunque una verifica legale approfondita.'
          : 'Attenzione: il sito potrebbe non essere conforme al GDPR. Questo può comportare sanzioni significative.'
        }
      </Text>
    </View>

    <View style={styles.footer}>
      <Text style={styles.footerText}>{branding.companyName}</Text>
      <Text style={styles.pageNumber}>Pagina 5</Text>
    </View>
  </Page>
)

// Issues & Recommendations Page
const IssuesPage = ({ data, branding }: { data: AuditReportData; branding: BrandingConfig }) => (
  <Page size="A4" style={styles.page}>
    <View style={styles.header}>
      <View>
        <Text style={styles.headerTitle}>Problemi Rilevati</Text>
        <Text style={styles.headerSubtitle}>Priorità e raccomandazioni</Text>
      </View>
    </View>

    {data.issues.length === 0 ? (
      <View style={styles.section}>
        <Text style={styles.sectionContent}>
          Nessun problema critico rilevato. Il sito è in buone condizioni.
        </Text>
      </View>
    ) : (
      <View style={styles.section}>
        {data.issues.map((issue, index) => (
          <IssueCard
            key={index}
            severity={issue.severity}
            title={issue.title}
            description={issue.description}
            recommendation={issue.recommendation}
          />
        ))}
      </View>
    )}

    <View style={styles.footer}>
      <Text style={styles.footerText}>{branding.companyName}</Text>
      <Text style={styles.pageNumber}>Pagina 6</Text>
    </View>
  </Page>
)

// Opportunities Page
const OpportunitiesPage = ({ data, branding }: { data: AuditReportData; branding: BrandingConfig }) => (
  <Page size="A4" style={styles.page}>
    <View style={styles.header}>
      <View>
        <Text style={styles.headerTitle}>Opportunità di Crescita</Text>
        <Text style={styles.headerSubtitle}>Come migliorare la tua presenza online</Text>
      </View>
    </View>

    {data.opportunities.length === 0 ? (
      <View style={styles.section}>
        <Text style={styles.sectionContent}>
          Nessuna opportunità di miglioramento significativa identificata.
        </Text>
      </View>
    ) : (
      <View style={styles.section}>
        {data.opportunities.map((opp, index) => {
          const priorityColor = opp.priority === 'high' ? colors.scorePoor
            : opp.priority === 'medium' ? colors.scoreFair
            : colors.info

          return (
            <View key={index} style={[styles.issueCard, { borderLeftColor: priorityColor }]}>
              <View style={styles.flexBetween}>
                <Text style={styles.issueTitle}>{opp.title}</Text>
                <Text style={[styles.badge, {
                  backgroundColor: opp.priority === 'high' ? '#FFEDD5' : opp.priority === 'medium' ? '#FEF3C7' : '#DBEAFE',
                  color: priorityColor
                }]}>
                  {opp.priority.toUpperCase()}
                </Text>
              </View>
              <Text style={styles.issueDescription}>{opp.description}</Text>
              {opp.estimatedImpact && (
                <Text style={[styles.issueDescription, { marginTop: 5, fontWeight: 'bold' }]}>
                  Impatto stimato: {opp.estimatedImpact}
                </Text>
              )}
            </View>
          )
        })}
      </View>
    )}

    <View style={styles.footer}>
      <Text style={styles.footerText}>{branding.companyName}</Text>
      <Text style={styles.pageNumber}>Pagina 7</Text>
    </View>
  </Page>
)

// Contact Page
const ContactPage = ({ branding }: { branding: BrandingConfig }) => (
  <Page size="A4" style={styles.page}>
    <View style={[styles.coverPage, { justifyContent: 'center' }]}>
      <Text style={[styles.coverTitle, { color: branding.primaryColor, fontSize: 28 }]}>
        Pronto a migliorare la tua presenza online?
      </Text>
      <Text style={styles.coverSubtitle}>
        Contattaci per una consulenza personalizzata
      </Text>

      <View style={{
        marginTop: 40,
        padding: 30,
        backgroundColor: colors.gray50,
        borderRadius: 10,
        width: '80%',
        alignItems: 'center'
      }}>
        {branding.companyLogo && (
          <Image src={branding.companyLogo} style={{ width: 120, height: 40, marginBottom: 20 }} />
        )}
        <Text style={{ fontSize: 20, fontWeight: 'bold', color: branding.primaryColor, marginBottom: 15 }}>
          {branding.companyName}
        </Text>

        {branding.contactEmail && (
          <Text style={{ fontSize: 12, color: colors.gray600, marginBottom: 8 }}>
            📧 {branding.contactEmail}
          </Text>
        )}
        {branding.contactPhone && (
          <Text style={{ fontSize: 12, color: colors.gray600, marginBottom: 8 }}>
            📞 {branding.contactPhone}
          </Text>
        )}
        {branding.website && (
          <Text style={{ fontSize: 12, color: colors.gray600 }}>
            🌐 {branding.website}
          </Text>
        )}
      </View>
    </View>

    <View style={styles.footer}>
      <Text style={styles.footerText}>{branding.footerText || `© ${new Date().getFullYear()} ${branding.companyName}`}</Text>
    </View>
  </Page>
)

// Main Audit Report Component
export const AuditReportDocument = ({
  data,
  branding = defaultBranding
}: {
  data: AuditReportData;
  branding?: BrandingConfig
}) => {
  const mergedBranding = { ...defaultBranding, ...branding }

  return (
    <Document
      title={data.metadata.reportTitle}
      author={mergedBranding.companyName}
      subject={`Audit Report per ${data.businessInfo.name}`}
      keywords="audit, seo, performance, website analysis"
      creator={mergedBranding.companyName}
    >
      <CoverPage data={data} branding={mergedBranding} />
      <ExecutiveSummaryPage data={data} branding={mergedBranding} />
      <SEOAnalysisPage data={data} branding={mergedBranding} />
      <TechnicalAnalysisPage data={data} branding={mergedBranding} />
      <TrackingGDPRPage data={data} branding={mergedBranding} />
      <IssuesPage data={data} branding={mergedBranding} />
      <OpportunitiesPage data={data} branding={mergedBranding} />
      <ContactPage branding={mergedBranding} />
    </Document>
  )
}

export default AuditReportDocument
