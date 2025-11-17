'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Navbar } from '@/components/nav/navbar'
import { Footer } from '@/components/nav/footer'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { templates } from '@/data/templates'
import { createClient } from '@/lib/supabase'

export default function TemplatesPage() {
  const router = useRouter()
  const supabase = createClient()

  const handleUseTemplate = async (templateId: string) => {
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      router.push('/auth/register')
      return
    }

    const template = templates.find(t => t.id === templateId)
    if (!template) return

    try {
      const { data, error } = await supabase
        .from('funnels')
        .insert([{
          user_id: user.id,
          name: template.name,
          steps: template.steps
        }] as any)
        .select()

      if (error) {
        console.error('Error creating funnel:', error.message || error)
        alert(`Failed to create funnel: ${error.message || 'Unknown error'}`)
        return
      }

      if (data && data[0]) {
        router.push(`/dashboard/funnels/${(data[0] as any).id}`)
      }
    } catch (err) {
      console.error('Unexpected error:', err)
      alert('An unexpected error occurred. Please try again.')
    }
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      
      <section className="container mx-auto px-4 py-20">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Funnel Templates
          </h1>
          <p className="text-xl text-muted-foreground">
            Start with a proven template and customize it to your needs
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {templates.map((template) => (
            <Card key={template.id} className="flex flex-col">
              <CardHeader>
                <CardTitle>{template.name}</CardTitle>
                <CardDescription>{template.description}</CardDescription>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col">
                <div className="mb-4 space-y-2">
                  {template.steps.map((step, index) => (
                    <div key={step.id} className="flex items-center gap-2 text-sm">
                      <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <span className="text-xs font-bold text-primary">{index + 1}</span>
                      </div>
                      <span className="text-muted-foreground">{step.title}</span>
                    </div>
                  ))}
                </div>
                <Button 
                  className="mt-auto" 
                  onClick={() => handleUseTemplate(template.id)}
                >
                  Use Template
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <Footer />
    </div>
  )
}
