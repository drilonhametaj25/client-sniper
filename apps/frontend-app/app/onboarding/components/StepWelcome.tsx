/**
 * StepWelcome - Step 1 del nuovo onboarding
 *
 * Schermata di benvenuto con value proposition TrovaMi.
 * Nessun dato da raccogliere, solo CTA "Iniziamo".
 */

'use client'

import { Zap, Target, FileText, Send } from 'lucide-react'
import type { StepProps } from '@/lib/types/onboarding-v2'

export default function StepWelcome({ onNext }: StepProps) {
  return (
    <div className="max-w-2xl mx-auto text-center px-4">
      {/* Logo / Icon */}
      <div className="mb-8">
        <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-blue-600 to-purple-600 rounded-2xl shadow-lg">
          <Target className="w-10 h-10 text-white" />
        </div>
      </div>

      {/* Headline */}
      <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
        Trova clienti pronti nella tua zona
      </h1>

      {/* Subtitle */}
      <p className="text-lg text-gray-600 dark:text-gray-400 mb-10 max-w-lg mx-auto">
        TrovaMi analizza i siti web delle attività locali,
        trova i problemi e ti prepara proposte commerciali
        pronte da inviare.
      </p>

      {/* Features */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        <FeatureCard
          icon={<Target className="w-6 h-6" />}
          title="Trova opportunità"
          description="Siti con problemi nella tua zona"
        />
        <FeatureCard
          icon={<FileText className="w-6 h-6" />}
          title="Report pronti"
          description="PDF professionale brandizzabile"
        />
        <FeatureCard
          icon={<Send className="w-6 h-6" />}
          title="Template outreach"
          description="Email, WhatsApp, LinkedIn"
        />
      </div>

      {/* First proposal badge */}
      <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-xl text-sm font-medium mb-8">
        <Zap className="w-4 h-4" />
        La tua prima proposta è GRATUITA!
      </div>

      {/* CTA */}
      <div>
        <button
          onClick={onNext}
          className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white text-lg font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all"
        >
          Iniziamo
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 7l5 5m0 0l-5 5m5-5H6"
            />
          </svg>
        </button>
      </div>

      {/* Setup time */}
      <p className="mt-6 text-sm text-gray-500 dark:text-gray-500">
        Setup veloce — meno di 2 minuti
      </p>
    </div>
  )
}

function FeatureCard({
  icon,
  title,
  description
}: {
  icon: React.ReactNode
  title: string
  description: string
}) {
  return (
    <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
      <div className="inline-flex items-center justify-center w-10 h-10 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg mb-3">
        {icon}
      </div>
      <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
        {title}
      </h3>
      <p className="text-sm text-gray-600 dark:text-gray-400">
        {description}
      </p>
    </div>
  )
}
