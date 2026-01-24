/**
 * Quotation PDF Template using @react-pdf/renderer
 * Template per generare PDF dei preventivi automatici
 */
import React from 'react'
import { Document, Page, Text, View, Image } from '@react-pdf/renderer'
import { styles, colors } from './pdf-styles'
import { BrandingConfig, defaultBranding } from '../types/pdf'

// Types for quotation data
export interface ServiceQuotation {
  service: string
  description: string
  basePrice: number
  adjustedPrice: number
  priority: 'critical' | 'high' | 'medium' | 'low'
  estimatedDays: number
  roiEstimate: string
  category: 'seo' | 'performance' | 'security' | 'design' | 'content' | 'compliance' | 'marketing' | 'development'
}

export interface QuotationData {
  leadId: string
  businessName: string
  websiteUrl: string
  services: ServiceQuotation[]
  subtotal: number
  discount?: {
    percentage: number
    reason: string
  }
  total: number
  validUntil: Date
  paymentTerms: string
  generatedAt: Date
  complexity: 'simple' | 'medium' | 'complex' | 'enterprise'
  estimatedTotalDays: number
  roiSummary: string
}

// Helper functions
const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('it-IT', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount)
}

const formatDate = (date: Date): string => {
  return new Date(date).toLocaleDateString('it-IT', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}

const getPriorityColor = (priority: ServiceQuotation['priority']): string => {
  switch (priority) {
    case 'critical': return '#7C3AED' // Purple
    case 'high': return colors.scoreCritical
    case 'medium': return colors.scoreFair
    case 'low': return colors.info
    default: return colors.gray500
  }
}

const getPriorityLabel = (priority: ServiceQuotation['priority']): string => {
  switch (priority) {
    case 'critical': return 'CRITICO'
    case 'high': return 'ALTA'
    case 'medium': return 'MEDIA'
    case 'low': return 'BASSA'
  }
}

const getComplexityLabel = (complexity: QuotationData['complexity']): string => {
  switch (complexity) {
    case 'simple': return 'Semplice'
    case 'medium': return 'Media'
    case 'complex': return 'Complesso'
    case 'enterprise': return 'Enterprise'
    default: return complexity
  }
}

const getCategoryLabel = (category: ServiceQuotation['category']): string => {
  switch (category) {
    case 'seo': return 'SEO'
    case 'performance': return 'Performance'
    case 'security': return 'Sicurezza'
    case 'design': return 'Design'
    case 'content': return 'Contenuti'
    case 'compliance': return 'Compliance'
    case 'marketing': return 'Marketing'
    case 'development': return 'Sviluppo'
    default: return category
  }
}

// Cover Page
const CoverPage = ({ data, branding }: { data: QuotationData; branding: BrandingConfig }) => (
  <Page size="A4" style={styles.page}>
    <View style={styles.coverPage}>
      {branding.companyLogo && (
        <Image src={branding.companyLogo} style={{ width: 150, height: 50, marginBottom: 40 }} />
      )}
      <Text style={[styles.coverTitle, { color: branding.primaryColor }]}>
        Preventivo
      </Text>
      <Text style={styles.coverSubtitle}>
        Servizi di ottimizzazione digitale
      </Text>

      <View style={{ marginTop: 40, alignItems: 'center' }}>
        <Text style={{ fontSize: 20, fontWeight: 'bold', color: colors.gray800, marginBottom: 10 }}>
          {data.businessName}
        </Text>
        <Text style={{ fontSize: 14, color: colors.gray500 }}>
          {data.websiteUrl}
        </Text>
      </View>

      <View style={{
        marginTop: 40,
        padding: 20,
        backgroundColor: colors.gray50,
        borderRadius: 8,
        width: '80%',
        alignItems: 'center'
      }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-around', width: '100%' }}>
          <View style={{ alignItems: 'center' }}>
            <Text style={{ fontSize: 28, fontWeight: 'bold', color: branding.primaryColor }}>
              {formatCurrency(data.total)}
            </Text>
            <Text style={{ fontSize: 10, color: colors.gray500, marginTop: 4 }}>TOTALE</Text>
          </View>
          <View style={{ alignItems: 'center' }}>
            <Text style={{ fontSize: 28, fontWeight: 'bold', color: branding.primaryColor }}>
              {data.services.length}
            </Text>
            <Text style={{ fontSize: 10, color: colors.gray500, marginTop: 4 }}>SERVIZI</Text>
          </View>
          <View style={{ alignItems: 'center' }}>
            <Text style={{ fontSize: 28, fontWeight: 'bold', color: branding.primaryColor }}>
              {data.estimatedTotalDays}
            </Text>
            <Text style={{ fontSize: 10, color: colors.gray500, marginTop: 4 }}>GIORNI</Text>
          </View>
        </View>
      </View>

      <View style={styles.coverMeta}>
        <Text>Data: {formatDate(data.generatedAt)}</Text>
        <Text style={{ marginTop: 5 }}>Validita: fino al {formatDate(data.validUntil)}</Text>
        <Text style={{ marginTop: 5 }}>Complessita: {getComplexityLabel(data.complexity)}</Text>
      </View>
    </View>

    <View style={styles.footer}>
      <Text style={styles.footerText}>{branding.footerText || `${branding.companyName}`}</Text>
    </View>
  </Page>
)

// Services List Page
const ServicesPage = ({
  data,
  branding,
  services,
  pageNumber,
  totalPages
}: {
  data: QuotationData
  branding: BrandingConfig
  services: ServiceQuotation[]
  pageNumber: number
  totalPages: number
}) => (
  <Page size="A4" style={styles.page}>
    <View style={styles.header}>
      <View>
        <Text style={styles.headerTitle}>Servizi Consigliati</Text>
        <Text style={styles.headerSubtitle}>Dettaglio interventi proposti</Text>
      </View>
      {branding.companyLogo && (
        <Image src={branding.companyLogo} style={styles.headerLogo} />
      )}
    </View>

    <View style={styles.section}>
      {services.map((service, index) => {
        const priorityColor = getPriorityColor(service.priority)

        return (
          <View
            key={index}
            style={[
              styles.issueCard,
              {
                borderLeftColor: priorityColor,
                marginBottom: 12
              }
            ]}
          >
            <View style={styles.flexBetween}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.issueTitle, { fontSize: 13 }]}>{service.service}</Text>
                <Text style={{ fontSize: 9, color: colors.gray400, marginTop: 2 }}>
                  {getCategoryLabel(service.category)}
                </Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={[
                  styles.badge,
                  {
                    backgroundColor: service.priority === 'critical' ? '#EDE9FE'
                      : service.priority === 'high' ? '#FEE2E2'
                      : service.priority === 'medium' ? '#FEF3C7'
                      : '#DBEAFE',
                    color: priorityColor
                  }
                ]}>
                  {getPriorityLabel(service.priority)}
                </Text>
              </View>
            </View>

            <Text style={[styles.issueDescription, { marginTop: 8 }]}>
              {service.description}
            </Text>

            <View style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              marginTop: 10,
              paddingTop: 8,
              borderTopWidth: 1,
              borderTopColor: colors.gray200
            }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={{ fontSize: 9, color: colors.gray500 }}>Tempo: </Text>
                <Text style={{ fontSize: 10, color: colors.gray700, fontWeight: 'bold' }}>
                  {service.estimatedDays} giorni
                </Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={{ fontSize: 9, color: colors.gray500 }}>ROI: </Text>
                <Text style={{ fontSize: 10, color: colors.success, fontWeight: 'bold' }}>
                  {service.roiEstimate}
                </Text>
              </View>
              <Text style={{ fontSize: 14, fontWeight: 'bold', color: branding.primaryColor }}>
                {formatCurrency(service.adjustedPrice)}
              </Text>
            </View>
          </View>
        )
      })}
    </View>

    <View style={styles.footer}>
      <Text style={styles.footerText}>{branding.companyName}</Text>
      <Text style={styles.pageNumber}>Pagina {pageNumber} di {totalPages}</Text>
    </View>
  </Page>
)

// Summary Page
const SummaryPage = ({ data, branding, pageNumber, totalPages }: {
  data: QuotationData
  branding: BrandingConfig
  pageNumber: number
  totalPages: number
}) => (
  <Page size="A4" style={styles.page}>
    <View style={styles.header}>
      <View>
        <Text style={styles.headerTitle}>Riepilogo e Condizioni</Text>
        <Text style={styles.headerSubtitle}>Termini del preventivo</Text>
      </View>
      {branding.companyLogo && (
        <Image src={branding.companyLogo} style={styles.headerLogo} />
      )}
    </View>

    {/* ROI Summary */}
    <View style={[styles.section, {
      backgroundColor: '#ECFDF5',
      padding: 15,
      borderRadius: 8,
      borderLeftWidth: 4,
      borderLeftColor: colors.success
    }]}>
      <Text style={{ fontSize: 12, fontWeight: 'bold', color: colors.success, marginBottom: 8 }}>
        ROI Stimato
      </Text>
      <Text style={{ fontSize: 11, color: colors.gray700, lineHeight: 1.6 }}>
        {data.roiSummary}
      </Text>
    </View>

    {/* Price Breakdown */}
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Riepilogo Costi</Text>
      <View style={styles.table}>
        <View style={styles.tableHeader}>
          <Text style={[styles.tableHeaderCell, { width: '60%' }]}>Voce</Text>
          <Text style={[styles.tableHeaderCell, { width: '40%', textAlign: 'right' }]}>Importo</Text>
        </View>

        {data.services.map((service, index) => (
          <View key={index} style={index % 2 === 0 ? styles.tableRow : styles.tableRowAlt}>
            <Text style={[styles.tableCell, { width: '60%' }]}>{service.service}</Text>
            <Text style={[styles.tableCell, { width: '40%', textAlign: 'right' }]}>
              {formatCurrency(service.adjustedPrice)}
            </Text>
          </View>
        ))}

        <View style={[styles.tableRow, { backgroundColor: colors.gray100 }]}>
          <Text style={[styles.tableCell, { width: '60%', fontWeight: 'bold' }]}>Subtotale</Text>
          <Text style={[styles.tableCell, { width: '40%', textAlign: 'right', fontWeight: 'bold' }]}>
            {formatCurrency(data.subtotal)}
          </Text>
        </View>

        {data.discount && (
          <View style={styles.tableRow}>
            <Text style={[styles.tableCell, { width: '60%', color: colors.success }]}>
              {data.discount.reason} (-{data.discount.percentage}%)
            </Text>
            <Text style={[styles.tableCell, { width: '40%', textAlign: 'right', color: colors.success }]}>
              -{formatCurrency(data.subtotal - data.total)}
            </Text>
          </View>
        )}

        <View style={[styles.tableRow, {
          backgroundColor: branding.primaryColor,
          borderBottomWidth: 0,
          borderRadius: 4
        }]}>
          <Text style={[styles.tableCell, { width: '60%', fontWeight: 'bold', color: colors.white }]}>
            TOTALE
          </Text>
          <Text style={[styles.tableCell, { width: '40%', textAlign: 'right', fontWeight: 'bold', color: colors.white, fontSize: 14 }]}>
            {formatCurrency(data.total)}
          </Text>
        </View>
      </View>
    </View>

    {/* Payment Terms */}
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Termini di Pagamento</Text>
      <Text style={styles.sectionContent}>
        {data.paymentTerms}
      </Text>
    </View>

    {/* Validity */}
    <View style={[styles.section, {
      backgroundColor: colors.gray50,
      padding: 15,
      borderRadius: 8
    }]}>
      <Text style={{ fontSize: 11, color: colors.gray600 }}>
        Questo preventivo e valido fino al {formatDate(data.validUntil)}.
      </Text>
      <Text style={{ fontSize: 11, color: colors.gray600, marginTop: 8 }}>
        I prezzi indicati sono da intendersi IVA esclusa.
      </Text>
    </View>

    <View style={styles.footer}>
      <Text style={styles.footerText}>{branding.companyName}</Text>
      <Text style={styles.pageNumber}>Pagina {pageNumber} di {totalPages}</Text>
    </View>
  </Page>
)

// Contact Page
const ContactPage = ({ branding, pageNumber, totalPages }: {
  branding: BrandingConfig
  pageNumber: number
  totalPages: number
}) => (
  <Page size="A4" style={styles.page}>
    <View style={[styles.coverPage, { justifyContent: 'center' }]}>
      <Text style={[styles.coverTitle, { color: branding.primaryColor, fontSize: 28 }]}>
        Pronto a iniziare?
      </Text>
      <Text style={styles.coverSubtitle}>
        Contattaci per approvare il preventivo
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
            Email: {branding.contactEmail}
          </Text>
        )}
        {branding.contactPhone && (
          <Text style={{ fontSize: 12, color: colors.gray600, marginBottom: 8 }}>
            Tel: {branding.contactPhone}
          </Text>
        )}
        {branding.website && (
          <Text style={{ fontSize: 12, color: colors.gray600 }}>
            Web: {branding.website}
          </Text>
        )}
      </View>

      <View style={{ marginTop: 40 }}>
        <Text style={{ fontSize: 10, color: colors.gray400, textAlign: 'center' }}>
          Preventivo generato automaticamente da TrovaMi
        </Text>
      </View>
    </View>

    <View style={styles.footer}>
      <Text style={styles.footerText}>{branding.footerText || `${branding.companyName}`}</Text>
      <Text style={styles.pageNumber}>Pagina {pageNumber} di {totalPages}</Text>
    </View>
  </Page>
)

// Main Quotation Document Component
export const QuotationDocument = ({
  data,
  branding = defaultBranding
}: {
  data: QuotationData
  branding?: BrandingConfig
}) => {
  const mergedBranding = { ...defaultBranding, ...branding }

  // Split services into pages (max 4 services per page for readability)
  const SERVICES_PER_PAGE = 4
  const servicePages: ServiceQuotation[][] = []
  for (let i = 0; i < data.services.length; i += SERVICES_PER_PAGE) {
    servicePages.push(data.services.slice(i, i + SERVICES_PER_PAGE))
  }

  // Total pages: cover + service pages + summary + contact
  const totalPages = 1 + servicePages.length + 1 + 1

  return (
    <Document
      title={`Preventivo per ${data.businessName}`}
      author={mergedBranding.companyName}
      subject={`Preventivo servizi digitali per ${data.businessName}`}
      keywords="preventivo, servizi digitali, ottimizzazione"
      creator={mergedBranding.companyName}
    >
      <CoverPage data={data} branding={mergedBranding} />

      {servicePages.map((services, index) => (
        <ServicesPage
          key={index}
          data={data}
          branding={mergedBranding}
          services={services}
          pageNumber={2 + index}
          totalPages={totalPages}
        />
      ))}

      <SummaryPage
        data={data}
        branding={mergedBranding}
        pageNumber={2 + servicePages.length}
        totalPages={totalPages}
      />

      <ContactPage
        branding={mergedBranding}
        pageNumber={totalPages}
        totalPages={totalPages}
      />
    </Document>
  )
}

export default QuotationDocument
