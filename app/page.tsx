import Link from 'next/link'
import { Navbar } from '@/components/nav/navbar'
import { Footer } from '@/components/nav/footer'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowRight, BarChart3, MousePointerClick, Zap } from 'lucide-react'

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      
      <section className="container mx-auto px-4 py-20 text-center">
        <h1 className="text-5xl md:text-6xl font-bold mb-6">
          Build High-Converting Sales Funnels
        </h1>
        <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
          Create professional sales funnels with our drag-and-drop builder. No coding required.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link href="/auth/register">
            <Button size="lg" className="gap-2">
              Start Building Free <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
          <Link href="/templates">
            <Button size="lg" variant="outline">
              View Templates
            </Button>
          </Link>
        </div>
      </section>

      <section id="features" className="bg-muted/50 py-20">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">
            How It Works
          </h2>
          <div className="grid md:grid-cols-4 gap-8">
            <Card>
              <CardHeader>
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                  <span className="text-2xl font-bold text-primary">1</span>
                </div>
                <CardTitle>Landing Page</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Capture visitor attention with a compelling landing page
                </CardDescription>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                  <span className="text-2xl font-bold text-primary">2</span>
                </div>
                <CardTitle>Lead Capture</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Collect contact information from interested visitors
                </CardDescription>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                  <span className="text-2xl font-bold text-primary">3</span>
                </div>
                <CardTitle>Sales Page</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Present your offer with a persuasive sales page
                </CardDescription>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                  <span className="text-2xl font-bold text-primary">4</span>
                </div>
                <CardTitle>Thank You</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Confirm conversion and deliver your promise
                </CardDescription>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      <section className="py-20">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">
            Powerful Features
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            <Card>
              <CardHeader>
                <MousePointerClick className="w-10 h-10 mb-4 text-primary" />
                <CardTitle>Drag & Drop Builder</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Build funnels visually with our intuitive drag-and-drop interface.
                </CardDescription>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <BarChart3 className="w-10 h-10 mb-4 text-primary" />
                <CardTitle>Advanced Analytics</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Monitor conversion rates with detailed analytics.
                </CardDescription>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <Zap className="w-10 h-10 mb-4 text-primary" />
                <CardTitle>Ready-Made Templates</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Start fast with professionally designed templates.
                </CardDescription>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  )
}
