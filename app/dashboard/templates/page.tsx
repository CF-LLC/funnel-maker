'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { templates } from '@/data/templates'
import { createClient } from '@/lib/supabase'

export default function DashboardTemplatesPage() {
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    // Check for pending template after login
    const pendingTemplate = sessionStorage.getItem('pendingTemplate')
    if (pendingTemplate) {
      sessionStorage.removeItem('pendingTemplate')
      handleUseTemplate(pendingTemplate)
    }
  }, [])

  const handleUseTemplate = async (templateId: string) => {
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      // Store the template ID to use after login
      sessionStorage.setItem('pendingTemplate', templateId)
      router.push('/auth/login?redirectTo=/dashboard/templates')
      return
    }

    const template = templates.find(t => t.id === templateId)
    if (!template) return

    try {
      // Ensure user exists in users table
      const { data: existingUser, error: userCheckError } = await supabase
        .from('users')
        .select('id')
        .eq('id', user.id)
        .maybeSingle()

      if (!existingUser && !userCheckError) {
        // Create user record if it doesn't exist
        const { error: insertUserError } = await supabase
          .from('users')
          .insert([{ id: user.id, email: user.email! }] as any)
        
        if (insertUserError) {
          console.error('Error creating user record:', JSON.stringify(insertUserError, null, 2))
          alert(`Failed to create user record: ${insertUserError.message || JSON.stringify(insertUserError)}`)
          return
        }
      }

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
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold mb-2">Funnel Templates</h1>
        <p className="text-muted-foreground">
          Start with a proven template and customize it to your needs
        </p>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
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
    </div>
  )
}
