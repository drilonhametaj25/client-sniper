/**
 * PDF Styles using @react-pdf/renderer StyleSheet
 */
import { StyleSheet, Font } from '@react-pdf/renderer'

// Register fonts (optional - uses default sans-serif if not registered)
// Font.register({
//   family: 'Inter',
//   src: 'https://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfAZ9hiJ-Ek-_EeA.woff2'
// })

export const colors = {
  primary: '#2563EB',
  secondary: '#1E40AF',
  accent: '#F59E0B',
  success: '#10B981',
  warning: '#F59E0B',
  danger: '#EF4444',
  info: '#3B82F6',

  // Grays
  white: '#FFFFFF',
  gray50: '#F9FAFB',
  gray100: '#F3F4F6',
  gray200: '#E5E7EB',
  gray300: '#D1D5DB',
  gray400: '#9CA3AF',
  gray500: '#6B7280',
  gray600: '#4B5563',
  gray700: '#374151',
  gray800: '#1F2937',
  gray900: '#111827',
  black: '#000000',

  // Score colors
  scoreCritical: '#EF4444',
  scorePoor: '#F97316',
  scoreFair: '#F59E0B',
  scoreGood: '#84CC16',
  scoreExcellent: '#10B981',
}

export const getScoreColor = (score: number): string => {
  if (score >= 80) return colors.scoreExcellent
  if (score >= 60) return colors.scoreGood
  if (score >= 40) return colors.scoreFair
  if (score >= 20) return colors.scorePoor
  return colors.scoreCritical
}

export const getSeverityColor = (severity: 'critical' | 'high' | 'medium' | 'low'): string => {
  switch (severity) {
    case 'critical': return colors.scoreCritical
    case 'high': return colors.scorePoor
    case 'medium': return colors.scoreFair
    case 'low': return colors.info
    default: return colors.gray500
  }
}

export const styles = StyleSheet.create({
  // Page Layout
  page: {
    flexDirection: 'column',
    backgroundColor: colors.white,
    padding: 40,
    fontFamily: 'Helvetica',
  },

  pageWithBackground: {
    flexDirection: 'column',
    backgroundColor: colors.gray50,
    padding: 40,
    fontFamily: 'Helvetica',
  },

  // Header Styles
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 30,
    paddingBottom: 20,
    borderBottomWidth: 2,
    borderBottomColor: colors.primary,
  },

  headerLogo: {
    width: 120,
    height: 40,
  },

  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.gray900,
  },

  headerSubtitle: {
    fontSize: 12,
    color: colors.gray500,
    marginTop: 4,
  },

  // Cover Page
  coverPage: {
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '100%',
    padding: 40,
  },

  coverTitle: {
    fontSize: 36,
    fontWeight: 'bold',
    color: colors.primary,
    marginBottom: 20,
    textAlign: 'center',
  },

  coverSubtitle: {
    fontSize: 18,
    color: colors.gray600,
    marginBottom: 40,
    textAlign: 'center',
  },

  coverMeta: {
    fontSize: 12,
    color: colors.gray500,
    marginTop: 60,
    textAlign: 'center',
  },

  // Section Styles
  section: {
    marginBottom: 25,
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.gray800,
    marginBottom: 15,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray200,
  },

  sectionContent: {
    fontSize: 11,
    color: colors.gray700,
    lineHeight: 1.6,
  },

  // Score Card Styles
  scoreCardsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 20,
  },

  scoreCard: {
    width: '30%',
    backgroundColor: colors.white,
    borderRadius: 8,
    padding: 15,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: colors.gray200,
    alignItems: 'center',
  },

  scoreCardLarge: {
    width: '100%',
    backgroundColor: colors.white,
    borderRadius: 8,
    padding: 25,
    marginBottom: 20,
    borderWidth: 2,
    borderColor: colors.primary,
    alignItems: 'center',
  },

  scoreValue: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 5,
  },

  scoreValueLarge: {
    fontSize: 48,
    fontWeight: 'bold',
    marginBottom: 8,
  },

  scoreLabel: {
    fontSize: 10,
    color: colors.gray500,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  scoreLabelLarge: {
    fontSize: 14,
    color: colors.gray600,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },

  // Table Styles
  table: {
    width: '100%',
    marginBottom: 20,
  },

  tableHeader: {
    flexDirection: 'row',
    backgroundColor: colors.gray100,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray300,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },

  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: colors.gray200,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },

  tableRowAlt: {
    flexDirection: 'row',
    backgroundColor: colors.gray50,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray200,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },

  tableCell: {
    fontSize: 10,
    color: colors.gray700,
  },

  tableHeaderCell: {
    fontSize: 10,
    fontWeight: 'bold',
    color: colors.gray800,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // Checklist Styles
  checklistItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },

  checkIcon: {
    width: 16,
    height: 16,
    marginRight: 10,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },

  checkIconPass: {
    backgroundColor: colors.success,
  },

  checkIconFail: {
    backgroundColor: colors.danger,
  },

  checkText: {
    fontSize: 11,
    color: colors.gray700,
    flex: 1,
  },

  // Issue/Opportunity Card Styles
  issueCard: {
    backgroundColor: colors.white,
    borderRadius: 6,
    padding: 12,
    marginBottom: 10,
    borderLeftWidth: 4,
  },

  issueTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: colors.gray800,
    marginBottom: 4,
  },

  issueDescription: {
    fontSize: 10,
    color: colors.gray600,
    lineHeight: 1.5,
  },

  issueRecommendation: {
    fontSize: 10,
    color: colors.gray700,
    marginTop: 6,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: colors.gray200,
    fontStyle: 'italic',
  },

  // Badge Styles
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    fontSize: 9,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },

  badgeCritical: {
    backgroundColor: '#FEE2E2',
    color: colors.scoreCritical,
  },

  badgeHigh: {
    backgroundColor: '#FFEDD5',
    color: colors.scorePoor,
  },

  badgeMedium: {
    backgroundColor: '#FEF3C7',
    color: colors.scoreFair,
  },

  badgeLow: {
    backgroundColor: '#DBEAFE',
    color: colors.info,
  },

  // Footer Styles
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 40,
    right: 40,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: colors.gray200,
  },

  footerText: {
    fontSize: 9,
    color: colors.gray400,
  },

  pageNumber: {
    fontSize: 9,
    color: colors.gray400,
  },

  // Utility Styles
  flexRow: {
    flexDirection: 'row',
  },

  flexCol: {
    flexDirection: 'column',
  },

  flexBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  textCenter: {
    textAlign: 'center',
  },

  textRight: {
    textAlign: 'right',
  },

  mb5: { marginBottom: 5 },
  mb10: { marginBottom: 10 },
  mb15: { marginBottom: 15 },
  mb20: { marginBottom: 20 },

  mt5: { marginTop: 5 },
  mt10: { marginTop: 10 },
  mt15: { marginTop: 15 },
  mt20: { marginTop: 20 },

  p10: { padding: 10 },
  p15: { padding: 15 },
  p20: { padding: 20 },
})
