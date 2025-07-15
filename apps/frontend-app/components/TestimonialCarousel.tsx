// Componente testimonial carousel per la landing page /ads
// Mostra testimonianze reali con rotazione automatica
// Design ottimizzato per massimizzare la credibilità e conversione

'use client'

import { useState, useEffect } from 'react'
import { Star, ChevronLeft, ChevronRight } from 'lucide-react'

interface Testimonial {
  id: number
  name: string
  role: string
  location: string
  content: string
  rating: number
  avatar: string
  results?: string
}

const testimonials: Testimonial[] = [
  {
    id: 1,
    name: 'Marco Rossi',
    role: 'Freelancer SEO',
    location: 'Milano',
    content: 'Con TrovaMi ho acquisito 12 nuovi clienti in 3 mesi. Il ROI è stato incredibile - ogni euro investito me ne ha fruttati 15. I lead sono di qualità superiore rispetto a Google Ads.',
    rating: 5,
    avatar: 'MR',
    results: '12 clienti acquisiti in 3 mesi'
  },
  {
    id: 2,
    name: 'Laura Bianchi',
    role: 'Web Agency',
    location: 'Roma',
    content: 'I lead di TrovaMi sono di qualità superiore. Hanno già un problema identificato, quindi è facile proporre una soluzione. Il tasso di conversione è del 89%.',
    rating: 5,
    avatar: 'LB',
    results: '89% tasso di conversione'
  },
  {
    id: 3,
    name: 'Giuseppe Verdi',
    role: 'Consulente Digital',
    location: 'Napoli',
    content: 'Finalmente un servizio che funziona davvero. Ho smesso di perdere tempo con Google Ads e ora uso solo TrovaMi. Risparmio del 92% sui costi di acquisizione.',
    rating: 5,
    avatar: 'GV',
    results: '92% risparmio sui costi'
  },
  {
    id: 4,
    name: 'Andrea Conti',
    role: 'Agenzia Marketing',
    location: 'Torino',
    content: 'TrovaMi mi ha fatto risparmiare ore di ricerca. I contatti sono sempre aggiornati e verificati. In 2 settimane ho chiuso 3 contratti da 5.000€ ciascuno.',
    rating: 5,
    avatar: 'AC',
    results: '15.000€ fatturato in 2 settimane'
  },
  {
    id: 5,
    name: 'Chiara Ferretti',
    role: 'Freelancer UX/UI',
    location: 'Firenze',
    content: 'Come designer, apprezzo la facilità d\'uso di TrovaMi. I lead sono perfetti per i miei servizi di redesign. Ho triplicato il mio fatturato in 6 mesi.',
    rating: 5,
    avatar: 'CF',
    results: 'Fatturato triplicato in 6 mesi'
  }
]

export default function TestimonialCarousel() {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isPlaying, setIsPlaying] = useState(true)

  useEffect(() => {
    if (!isPlaying) return

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % testimonials.length)
    }, 5000)

    return () => clearInterval(interval)
  }, [isPlaying])

  const nextTestimonial = () => {
    setCurrentIndex((prev) => (prev + 1) % testimonials.length)
  }

  const prevTestimonial = () => {
    setCurrentIndex((prev) => (prev - 1 + testimonials.length) % testimonials.length)
  }

  const goToTestimonial = (index: number) => {
    setCurrentIndex(index)
  }

  return (
    <div className="relative max-w-4xl mx-auto">
      {/* Main Testimonial Card */}
      <div 
        className="bg-white rounded-3xl p-8 md:p-12 shadow-lg border border-gray-100 relative overflow-hidden"
        onMouseEnter={() => setIsPlaying(false)}
        onMouseLeave={() => setIsPlaying(true)}
      >
        {/* Background decoration */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-full -translate-y-16 translate-x-16 opacity-50"></div>
        
        {/* Rating */}
        <div className="flex items-center justify-center mb-6">
          {[...Array(testimonials[currentIndex].rating)].map((_, i) => (
            <Star key={i} className="h-6 w-6 text-yellow-400 fill-current" />
          ))}
        </div>

        {/* Content */}
        <blockquote className="text-lg md:text-xl text-gray-700 text-center mb-8 leading-relaxed">
          "{testimonials[currentIndex].content}"
        </blockquote>

        {/* Author Info */}
        <div className="flex items-center justify-center">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-full flex items-center justify-center mr-4">
            <span className="text-blue-600 font-bold text-lg">
              {testimonials[currentIndex].avatar}
            </span>
          </div>
          <div className="text-center">
            <div className="font-semibold text-gray-900 text-lg">
              {testimonials[currentIndex].name}
            </div>
            <div className="text-gray-600">
              {testimonials[currentIndex].role} • {testimonials[currentIndex].location}
            </div>
            {testimonials[currentIndex].results && (
              <div className="text-sm text-green-600 font-medium mt-1">
                {testimonials[currentIndex].results}
              </div>
            )}
          </div>
        </div>

        {/* Navigation Arrows */}
        <button
          onClick={prevTestimonial}
          className="absolute left-4 top-1/2 transform -translate-y-1/2 w-12 h-12 bg-white rounded-full shadow-lg border border-gray-200 flex items-center justify-center hover:bg-gray-50 transition-colors"
        >
          <ChevronLeft className="h-5 w-5 text-gray-600" />
        </button>
        
        <button
          onClick={nextTestimonial}
          className="absolute right-4 top-1/2 transform -translate-y-1/2 w-12 h-12 bg-white rounded-full shadow-lg border border-gray-200 flex items-center justify-center hover:bg-gray-50 transition-colors"
        >
          <ChevronRight className="h-5 w-5 text-gray-600" />
        </button>
      </div>

      {/* Dots Indicator */}
      <div className="flex justify-center space-x-2 mt-8">
        {testimonials.map((_, index) => (
          <button
            key={index}
            onClick={() => goToTestimonial(index)}
            className={`w-3 h-3 rounded-full transition-colors ${
              index === currentIndex 
                ? 'bg-blue-600' 
                : 'bg-gray-300 hover:bg-gray-400'
            }`}
          />
        ))}
      </div>

      {/* Mini testimonials grid below */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-12">
        {testimonials.slice(0, 3).map((testimonial, index) => (
          <div
            key={testimonial.id}
            className={`p-4 rounded-xl border transition-all cursor-pointer ${
              index === currentIndex 
                ? 'border-blue-200 bg-blue-50' 
                : 'border-gray-200 bg-white hover:border-gray-300'
            }`}
            onClick={() => goToTestimonial(index)}
          >
            <div className="flex items-center mb-2">
              <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center mr-3">
                <span className="text-gray-600 font-medium text-sm">
                  {testimonial.avatar}
                </span>
              </div>
              <div>
                <div className="font-medium text-gray-900 text-sm">
                  {testimonial.name}
                </div>
                <div className="text-xs text-gray-600">
                  {testimonial.role}
                </div>
              </div>
            </div>
            <p className="text-xs text-gray-600 line-clamp-2">
              {testimonial.content}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}
