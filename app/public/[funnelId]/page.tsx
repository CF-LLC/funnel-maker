'use client'

import { useEffect, useState, use } from 'react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Heart } from 'lucide-react'

interface AffiliateLink {
  id: string
  url: string
  buttonText: string
  icon?: string
}

interface Step {
  id: string
  title: string
  type: string
  content: string
  affiliateUrl?: string
  buttonText?: string
  backgroundColor?: string
  backgroundImage?: string
  textColor?: string
  affiliateLinks?: AffiliateLink[]
  buttonStyle?: 'modern' | 'sharp' | 'pill' | 'gradient' | 'outline' | 'glass'
}

export default function PublicFunnelPage({ params }: { params: Promise<{ funnelId: string }> }) {
  const resolvedParams = use(params)
  const [funnel, setFunnel] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchFunnel()
  }, [])

  const fetchFunnel = async () => {
    try {
      const res = await fetch(`/api/public/funnels/${resolvedParams.funnelId}`)
      const data = await res.json()

      if (res.ok) {
        setFunnel(data.funnel)
      } else {
        setError(data.error || 'Funnel not found')
      }
    } catch (err) {
      setError('Failed to load funnel')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Alert variant="destructive" className="max-w-md">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    )
  }

  const steps = funnel?.steps || []

  return (
    <div className="min-h-screen flex flex-col">
      {/* Funnel Content */}
      <div className="flex-1">
        {steps.map((step: Step) => (
          <div key={step.id}>
            {step.type === 'affiliate-link' ? (
              <div
                className="min-h-screen flex flex-col items-center justify-center text-center p-8 md:p-12"
                style={{
                  background: step.backgroundImage
                    ? `linear-gradient(rgba(0,0,0,0.4), rgba(0,0,0,0.4)), url(${step.backgroundImage})`
                    : step.backgroundColor || '#6366f1',
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  color: step.textColor || '#ffffff',
                }}
              >
                <div className="space-y-8 max-w-3xl w-full">
                  <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight drop-shadow-lg">{step.title}</h2>
                  <p className="text-xl md:text-2xl whitespace-pre-wrap opacity-95 leading-relaxed drop-shadow">{step.content}</p>
                    
                    <div className="space-y-4 max-w-xl mx-auto">
                      {(step.affiliateLinks && step.affiliateLinks.length > 0) ? (
                        step.affiliateLinks.map((link) => {
                          const buttonStyle = step.buttonStyle || 'modern'
                          const getButtonClasses = () => {
                            const base = "flex items-center justify-center gap-3 px-8 py-4 font-bold text-lg transition-all duration-200"
                            
                            switch(buttonStyle) {
                              case 'sharp':
                                return `${base} bg-white text-gray-900 shadow-2xl hover:scale-105`
                              case 'pill':
                                return `${base} bg-white text-gray-900 rounded-full shadow-2xl hover:scale-105`
                              case 'gradient':
                                return `${base} bg-gradient-to-r from-pink-500 to-orange-500 text-white rounded-xl shadow-2xl hover:scale-105`
                              case 'outline':
                                return `${base} bg-transparent border-2 border-white text-white rounded-xl hover:bg-white hover:text-gray-900`
                              case 'glass':
                                return `${base} bg-white/20 backdrop-blur-md border border-white/30 text-white rounded-xl shadow-2xl hover:bg-white/30`
                              case 'modern':
                              default:
                                return `${base} bg-white text-gray-900 rounded-xl shadow-2xl hover:scale-105`
                            }
                          }
                          
                          return (
                            <a
                              key={link.id}
                              href={link.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className={getButtonClasses()}
                            >
                              {link.icon && <span className="text-2xl">{link.icon}</span>}
                              <span>{link.buttonText}</span>
                            </a>
                          )
                        })
                      ) : step.affiliateUrl ? (
                        // Legacy support for old single-link format
                        <a
                          href={step.affiliateUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-block px-10 py-5 bg-white text-gray-900 font-bold text-lg rounded-xl hover:scale-105 transition-transform shadow-2xl"
                        >
                          {step.buttonText || 'Click Here'}
                        </a>
                      ) : null}
                    </div>
                  </div>
                </div>
              ) : (
              <div className="min-h-screen flex items-center justify-center p-8">
                <div className="max-w-4xl w-full">
                  <div className="prose prose-lg max-w-none">
                    <h2 className="text-4xl font-bold mb-4">{step.title}</h2>
                    <p className="text-xl whitespace-pre-wrap">{step.content}</p>
                  </div>
                </div>
              </div>
            )}
            </div>
          ))}
        </div>

        {steps.length === 0 && (
          <div className="min-h-screen flex items-center justify-center">
            <p className="text-muted-foreground">This funnel has no steps yet.</p>
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="py-4 text-center border-t bg-background">
        <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <a 
            href="https://cf-llc.github.io" 
            target="_blank" 
            rel="noopener noreferrer"
            className="font-semibold hover:text-foreground transition-colors"
          >
            CF-LLC
          </a>
          <span>Made With</span>
          <Heart className="w-4 h-4 fill-red-500 text-red-500" />
        </div>
      </footer>
    </div>
  )
}
