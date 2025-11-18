import Link from 'next/link'
import { createServerClient } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Plus } from 'lucide-react'

export default async function FunnelsPage() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: funnels } = await supabase
    .from('funnels')
    .select('*')
    .eq('user_id', user!.id)
    .order('created_at', { ascending: false })

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">My Funnels</h1>
          <p className="text-muted-foreground">Manage all your funnels</p>
        </div>
        <Link href="/dashboard/templates">
          <Button className="gap-2">
            <Plus className="w-4 h-4" />
            New Funnel
          </Button>
        </Link>
      </div>

      {!funnels || funnels.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <h3 className="text-lg font-semibold mb-2">No funnels yet</h3>
            <p className="text-muted-foreground mb-4">
              Create your first funnel to get started
            </p>
            <Link href="/dashboard/templates">
              <Button>Browse Templates</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {funnels.map((funnel: any) => (
            <Link key={funnel.id} href={`/dashboard/funnels/${funnel.id}`}>
              <Card className="hover:border-primary transition-colors cursor-pointer h-full">
                <CardHeader>
                  <CardTitle>{funnel.name}</CardTitle>
                  <CardDescription>
                    {Array.isArray(funnel.steps) ? funnel.steps.length : 0} steps
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Created {new Date(funnel.created_at).toLocaleDateString()}
                  </p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
