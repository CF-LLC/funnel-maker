import Link from 'next/link'
import { createServerClient } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Plus, ExternalLink } from 'lucide-react'

export default async function FunnelsPage() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: funnels } = await supabase
    .from('funnels')
    .select('*')
    .eq('user_id', user!.id)
    .order('created_at', { ascending: false })

  return (
    <div className="space-y-6 sm:space-y-8">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">My Funnels</h1>
          <p className="text-sm sm:text-base text-muted-foreground">Manage all your funnels</p>
        </div>
        <Link href="/dashboard/templates">
          <Button className="gap-2 w-full sm:w-auto">
            <Plus className="w-4 h-4" />
            New Funnel
          </Button>
        </Link>
      </div>

      {!funnels || funnels.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 px-4">
            <h3 className="text-base sm:text-lg font-semibold mb-2">No funnels yet</h3>
            <p className="text-sm sm:text-base text-muted-foreground mb-4 text-center">
              Create your first funnel to get started
            </p>
            <Link href="/dashboard/templates">
              <Button>Browse Templates</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {funnels.map((funnel: any) => (
            <Card key={funnel.id} className="hover:border-primary transition-colors h-full">
              <CardHeader>
                <CardTitle className="text-lg sm:text-xl">{funnel.name}</CardTitle>
                <CardDescription className="text-sm">
                  {Array.isArray(funnel.steps) ? funnel.steps.length : 0} steps
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-xs sm:text-sm text-muted-foreground">
                  Created {new Date(funnel.created_at).toLocaleDateString()}
                </p>
                {funnel.slug && (
                  <p className="text-xs text-muted-foreground">
                    URL: /f/{funnel.slug}
                  </p>
                )}
                <div className="flex gap-2">
                  <Link href={`/dashboard/funnels/${funnel.id}`} className="flex-1">
                    <Button variant="outline" className="w-full">Edit</Button>
                  </Link>
                  {funnel.is_public && (
                    <Link 
                      href={funnel.slug ? `/f/${funnel.slug}` : `/public/${funnel.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Button variant="default" size="icon">
                        <ExternalLink className="w-4 h-4" />
                      </Button>
                    </Link>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
