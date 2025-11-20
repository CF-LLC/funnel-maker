'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core'
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { createClient } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { SortableStep } from '@/components/builder/sortable-step'
import { CollaboratorPresence } from '@/components/builder/collaborator-presence'
import { StepTypeDialog } from '@/components/builder/step-type-dialog'
import { LandingEditor, LeadCaptureEditor, SalesEditor, ThankYouEditor, AffiliateLinkEditor } from '@/components/builder/step-editors'
import { Plus, Save, ArrowLeft, Trash2, Download, Share2, Copy } from 'lucide-react'
import Link from 'next/link'
import type { FunnelStep, AffiliateLink } from '@/data/templates'
import { RealtimeCollaboration, Collaborator } from '@/lib/realtime-collaboration'
import { Badge } from '@/components/ui/badge'

export default function FunnelBuilderPage() {
  const params = useParams()
  const router = useRouter()
  const supabase = createClient()
  const [funnel, setFunnel] = useState<any>(null)
  const [funnelName, setFunnelName] = useState('')
  const [funnelSlug, setFunnelSlug] = useState('')
  const [steps, setSteps] = useState<FunnelStep[]>([])
  const [selectedStep, setSelectedStep] = useState<FunnelStep | null>(null)
  const [saving, setSaving] = useState(false)
  const [collaborators, setCollaborators] = useState<Collaborator[]>([])
  const [realtimeCollab, setRealtimeCollab] = useState<RealtimeCollaboration | null>(null)
  const [isPublic, setIsPublic] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [userId, setUserId] = useState<string>('')
  const [userEmail, setUserEmail] = useState<string>('')
  const [showStepTypeDialog, setShowStepTypeDialog] = useState(false)

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  useEffect(() => {
    loadFunnel()
    loadUser()
    
    return () => {
      if (realtimeCollab) {
        realtimeCollab.disconnect()
      }
    }
  }, [params.funnelId])

  const loadUser = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      setUserId(user.id)
      const { data: userData } = await (supabase.from('users') as any)
        .select('email')
        .eq('id', user.id)
        .single()
      if (userData) {
        setUserEmail(userData.email)
      }
    }
  }

  const loadFunnel = async () => {
    const { data } = await (supabase
      .from('funnels') as any)
      .select('*')
      .eq('id', params.funnelId as string)
      .single()

    if (data) {
      setFunnel(data)
      setFunnelName(data.name)
      setFunnelSlug(data.slug || '')
      setSteps(Array.isArray(data.steps) ? data.steps : [])
      setIsPublic(data.is_public || false)
    }
  }

  useEffect(() => {
    if (userId && userEmail && params.funnelId) {
      const collab = new RealtimeCollaboration(
        params.funnelId as string,
        userId,
        userEmail
      )
      
      collab.connect(
        (collabs) => setCollaborators(collabs.filter(c => c.id !== userId)),
        (updatedSteps) => setSteps(updatedSteps)
      )
      
      setRealtimeCollab(collab)
    }
  }, [userId, userEmail, params.funnelId])

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event

    if (over && active.id !== over.id) {
      setSteps((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id)
        const newIndex = items.findIndex((item) => item.id === over.id)
        const newItems = arrayMove(items, oldIndex, newIndex)
        const updatedSteps = newItems.map((item, index) => ({ ...item, order: index }))
        
        // Broadcast update to collaborators
        if (realtimeCollab) {
          realtimeCollab.broadcastUpdate(updatedSteps)
        }
        
        return updatedSteps
      })
    }
  }

  const addStep = () => {
    setShowStepTypeDialog(true)
  }

  const createStepWithType = (type: FunnelStep['type']) => {
    const stepTitles = {
      'landing': 'New Landing Page',
      'lead-capture': 'New Lead Capture Form',
      'sales': 'New Sales Page',
      'thank-you': 'Thank You Page',
      'affiliate-link': 'Affiliate Links Page'
    }

    const newStep: FunnelStep = {
      id: `step-${Date.now()}`,
      type,
      title: stepTitles[type] || 'New Step',
      content: 'Add your content here...',
      order: steps.length,
    }

    // Initialize type-specific defaults
    if (type === 'affiliate-link') {
      newStep.backgroundColor = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
      newStep.textColor = '#ffffff'
      newStep.affiliateLinks = []
      newStep.buttonStyle = 'modern'
    } else if (type === 'lead-capture') {
      newStep.formFields = ['name', 'email']
      newStep.ctaText = 'Submit'
    } else if (type === 'sales') {
      newStep.pricing = { amount: '$99', currency: 'USD', interval: 'one-time' }
      newStep.ctaText = 'Buy Now'
    } else if (type === 'landing') {
      newStep.ctaText = 'Get Started'
      newStep.features = []
    } else if (type === 'thank-you') {
      newStep.ctaText = 'Continue'
    }

    setSteps([...steps, newStep])
    setSelectedStep(newStep)
  }

  const updateStep = (updatedStep: FunnelStep) => {
    const newSteps = steps.map((step) => (step.id === updatedStep.id ? updatedStep : step))
    setSteps(newSteps)
    setSelectedStep(updatedStep)
    
    // Broadcast update to collaborators
    if (realtimeCollab) {
      realtimeCollab.broadcastUpdate(newSteps)
    }
  }

  const deleteStep = (stepId: string) => {
    const newSteps = steps.filter((step) => step.id !== stepId).map((step, index) => ({ ...step, order: index }))
    setSteps(newSteps)
    if (selectedStep?.id === stepId) {
      setSelectedStep(null)
    }
    
    // Broadcast update to collaborators
    if (realtimeCollab) {
      realtimeCollab.broadcastUpdate(newSteps)
    }
  }

  const saveFunnel = async () => {
    setSaving(true)
    
    // Sanitize slug
    const sanitizedSlug = funnelSlug
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
    
    const { error } = await (supabase
      .from('funnels') as any)
      .update({ 
        name: funnelName, 
        steps, 
        is_public: isPublic,
        slug: sanitizedSlug || null
      })
      .eq('id', params.funnelId as string)

    if (error) {
      console.error('Error saving funnel:', error)
      if (error.code === '23505') {
        alert('This URL slug is already taken. Please choose a different one.')
      }
    } else {
      setFunnelSlug(sanitizedSlug)
    }
    setSaving(false)
  }

  const togglePublic = async () => {
    const newIsPublic = !isPublic
    setIsPublic(newIsPublic)
    await (supabase
      .from('funnels') as any)
      .update({ is_public: newIsPublic })
      .eq('id', params.funnelId as string)
  }

  const copyPublicLink = () => {
    const link = funnelSlug 
      ? `${window.location.origin}/f/${funnelSlug}`
      : `${window.location.origin}/public/${params.funnelId}`
    navigator.clipboard.writeText(link)
    alert('Public link copied to clipboard!')
  }

  const exportFunnel = async () => {
    setExporting(true)
    try {
      const res = await fetch(`/api/funnels/${params.funnelId}/export`)
      if (res.ok) {
        const blob = await res.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `${funnelName.toLowerCase().replace(/\s+/g, '-')}-funnel.zip`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
      }
    } catch (error) {
      console.error('Export error:', error)
    } finally {
      setExporting(false)
    }
  }

  const deleteFunnel = async () => {
    if (!confirm('Are you sure you want to delete this funnel?')) return

    const { error } = await supabase
      .from('funnels')
      .delete()
      .eq('id', params.funnelId as string)

    if (!error) {
      router.push('/dashboard/funnels')
    }
  }

  if (!funnel) {
    return <div>Loading...</div>
  }

  return (
    <div className="min-h-screen p-4 sm:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-start gap-2 sm:gap-4 flex-1 w-full">
          <Link href="/dashboard/funnels">
            <Button variant="ghost" size="icon" className="shrink-0">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div className="flex-1 space-y-2 min-w-0">
            <Input
              value={funnelName}
              onChange={(e) => setFunnelName(e.target.value)}
              className="text-xl sm:text-2xl font-bold border-none p-0 h-auto focus-visible:ring-0"
              placeholder="Funnel Name"
            />
            <div className="flex items-center gap-2 text-sm flex-wrap">
              <Label className="text-muted-foreground whitespace-nowrap text-xs sm:text-sm">URL:</Label>
              <div className="flex items-center gap-1 flex-1 min-w-0">
                <span className="text-muted-foreground text-xs sm:text-sm truncate">myfunnelr.vercel.app/f/</span>
                <Input
                  value={funnelSlug}
                  onChange={(e) => setFunnelSlug(e.target.value)}
                  placeholder="my-funnel"
                  className="h-7 text-xs sm:text-sm flex-1 min-w-0"
                />
              </div>
            </div>
          </div>
          {isPublic && <Badge variant="secondary" className="shrink-0">Public</Badge>}
        </div>
        
        {/* Action Buttons */}
        <div className="flex gap-2 items-center flex-wrap w-full sm:w-auto">
          <CollaboratorPresence collaborators={collaborators} />
          <Button variant="outline" size="sm" onClick={togglePublic} className="text-xs sm:text-sm">
            <Share2 className="w-3 h-3 sm:w-4 sm:h-4 sm:mr-2" />
            <span className="hidden sm:inline">{isPublic ? 'Make Private' : 'Make Public'}</span>
          </Button>
          {isPublic && (
            <Button variant="outline" size="sm" onClick={copyPublicLink} className="text-xs sm:text-sm">
              <Copy className="w-3 h-3 sm:w-4 sm:h-4 sm:mr-2" />
              <span className="hidden sm:inline">Copy Link</span>
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={exportFunnel} disabled={exporting} className="text-xs sm:text-sm">
            <Download className="w-3 h-3 sm:w-4 sm:h-4 sm:mr-2" />
            <span className="hidden sm:inline">{exporting ? 'Exporting...' : 'Export'}</span>
          </Button>
          <Button variant="destructive" size="sm" onClick={deleteFunnel} className="text-xs sm:text-sm">
            <Trash2 className="w-3 h-3 sm:w-4 sm:h-4 sm:mr-2" />
            <span className="hidden sm:inline">Delete</span>
          </Button>
          <Button size="sm" onClick={saveFunnel} disabled={saving} className="text-xs sm:text-sm">
            <Save className="w-3 h-3 sm:w-4 sm:h-4 sm:mr-2" />
            {saving ? 'Saving...' : 'Save'}
          </Button>
        </div>
      </div>

      {/* Main Content - Responsive Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] xl:grid-cols-[300px_1fr_350px] gap-4 sm:gap-6">
        {/* Steps List */}
        <Card className="overflow-auto max-h-[600px] lg:max-h-none">
          <CardHeader>
            <CardTitle className="flex items-center justify-between text-base sm:text-lg">
              <span>Funnel Steps</span>
              <Button size="sm" onClick={addStep}>
                <Plus className="w-4 h-4" />
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={steps.map((s) => s.id)} strategy={verticalListSortingStrategy}>
                <div className="space-y-2">
                  {steps.map((step) => (
                    <SortableStep
                      key={step.id}
                      step={step}
                      isSelected={selectedStep?.id === step.id}
                      onClick={() => setSelectedStep(step)}
                      onDelete={() => deleteStep(step.id)}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          </CardContent>
        </Card>

        {/* Preview */}
        <Card className="overflow-auto flex flex-col max-h-[600px] lg:max-h-none">
          <CardHeader className="border-b">
            <CardTitle className="text-base sm:text-lg">Live Preview</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 p-0">
            {selectedStep ? (
              <div className="h-full">
                {selectedStep.type === 'affiliate-link' ? (
                  <div 
                    className="w-full h-full min-h-[400px] sm:min-h-[600px] flex flex-col items-center justify-center text-center px-4 sm:px-8"
                    style={{
                      background: selectedStep.backgroundImage 
                        ? `linear-gradient(rgba(0,0,0,0.4), rgba(0,0,0,0.4)), url(${selectedStep.backgroundImage})`
                        : selectedStep.backgroundColor || '#6366f1',
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                      color: selectedStep.textColor || '#ffffff',
                    }}
                  >
                    <div className="space-y-6 sm:space-y-8 max-w-3xl w-full">
                      <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold leading-tight drop-shadow-lg">
                        {selectedStep.title}
                      </h1>
                      <p className="text-base sm:text-lg md:text-xl lg:text-2xl whitespace-pre-wrap opacity-95 leading-relaxed drop-shadow">
                        {selectedStep.content}
                      </p>
                      <div className="space-y-3 sm:space-y-4 max-w-xl mx-auto">
                        {(selectedStep.affiliateLinks && selectedStep.affiliateLinks.length > 0) ? (
                          selectedStep.affiliateLinks.map((link) => {
                            const buttonStyle = selectedStep.buttonStyle || 'modern'
                            const getButtonClasses = () => {
                              const base = "flex items-center justify-center gap-2 sm:gap-3 px-6 sm:px-8 py-3 sm:py-4 font-bold text-base sm:text-lg transition-all duration-200"
                              
                              switch(buttonStyle) {
                                case 'sharp':
                                  return `${base} bg-white text-gray-900 shadow-2xl hover:scale-105 hover:shadow-3xl`
                                case 'pill':
                                  return `${base} bg-white text-gray-900 rounded-full shadow-2xl hover:scale-105 hover:shadow-3xl`
                                case 'gradient':
                                  return `${base} bg-gradient-to-r from-pink-500 to-orange-500 text-white rounded-xl shadow-2xl hover:scale-105 hover:shadow-3xl`
                                case 'outline':
                                  return `${base} bg-transparent border-2 border-white text-white rounded-xl hover:bg-white hover:text-gray-900`
                                case 'glass':
                                  return `${base} bg-white/20 backdrop-blur-md border border-white/30 text-white rounded-xl shadow-2xl hover:bg-white/30`
                                case 'modern':
                                default:
                                  return `${base} bg-white text-gray-900 rounded-xl shadow-2xl hover:scale-105 hover:shadow-3xl`
                              }
                            }
                            
                            return (
                              <a
                                key={link.id}
                                href={link.url || '#'}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={getButtonClasses()}
                                onClick={(e) => e.preventDefault()}
                              >
                                {link.icon && <span className="text-xl sm:text-2xl">{link.icon}</span>}
                                <span>{link.buttonText}</span>
                              </a>
                            )
                          })
                        ) : (
                          <div className="text-xs sm:text-sm opacity-75">
                            Add affiliate links below
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ) : selectedStep.type === 'landing' ? (
                  <div className="w-full h-full min-h-[600px] bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
                    <div className="max-w-4xl mx-auto px-8 py-16 text-center space-y-8">
                      <h1 className="text-5xl md:text-6xl font-bold text-gray-900 dark:text-white leading-tight">
                        {selectedStep.title}
                      </h1>
                      <p className="text-xl md:text-2xl text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">
                        {selectedStep.content}
                      </p>
                      <button className="px-10 py-5 bg-indigo-600 text-white font-bold text-lg rounded-xl shadow-xl hover:bg-indigo-700 hover:scale-105 transition-all">
                        Get Started
                      </button>
                    </div>
                  </div>
                ) : selectedStep.type === 'lead-capture' ? (
                  <div className="w-full h-full min-h-[600px] bg-gradient-to-br from-purple-50 to-pink-100 dark:from-gray-900 dark:to-purple-900">
                    <div className="max-w-2xl mx-auto px-8 py-16">
                      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-10">
                        <div className="text-center space-y-6 mb-8">
                          <h2 className="text-4xl font-bold text-gray-900 dark:text-white">
                            {selectedStep.title}
                          </h2>
                          <p className="text-lg text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                            {selectedStep.content}
                          </p>
                        </div>
                        <div className="space-y-4">
                          <input 
                            type="text" 
                            placeholder="Your Name" 
                            className="w-full px-4 py-3 rounded-lg border-2 border-gray-300 focus:border-purple-600 focus:outline-none"
                          />
                          <input 
                            type="email" 
                            placeholder="Your Email" 
                            className="w-full px-4 py-3 rounded-lg border-2 border-gray-300 focus:border-purple-600 focus:outline-none"
                          />
                          <button className="w-full px-8 py-4 bg-purple-600 text-white font-bold text-lg rounded-lg shadow-lg hover:bg-purple-700 transition-colors">
                            Submit
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : selectedStep.type === 'sales' ? (
                  <div className="w-full h-full min-h-[600px] bg-gradient-to-br from-green-50 to-emerald-100 dark:from-gray-900 dark:to-green-900">
                    <div className="max-w-4xl mx-auto px-8 py-16 space-y-12">
                      <div className="text-center space-y-6">
                        <h1 className="text-5xl md:text-6xl font-bold text-gray-900 dark:text-white">
                          {selectedStep.title}
                        </h1>
                        <p className="text-xl md:text-2xl text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                          {selectedStep.content}
                        </p>
                      </div>
                      <div className="grid md:grid-cols-3 gap-6">
                        <div className="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-lg text-center">
                          <div className="text-4xl font-bold text-green-600 mb-2">$29</div>
                          <div className="text-sm text-gray-600 dark:text-gray-400 mb-4">per month</div>
                          <button className="w-full px-6 py-3 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition-colors">
                            Choose Plan
                          </button>
                        </div>
                        <div className="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-2xl text-center border-4 border-green-600 relative">
                          <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-green-600 text-white px-4 py-1 rounded-full text-sm font-bold">
                            Popular
                          </div>
                          <div className="text-4xl font-bold text-green-600 mb-2">$79</div>
                          <div className="text-sm text-gray-600 dark:text-gray-400 mb-4">per month</div>
                          <button className="w-full px-6 py-3 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition-colors">
                            Choose Plan
                          </button>
                        </div>
                        <div className="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-lg text-center">
                          <div className="text-4xl font-bold text-green-600 mb-2">$199</div>
                          <div className="text-sm text-gray-600 dark:text-gray-400 mb-4">per month</div>
                          <button className="w-full px-6 py-3 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition-colors">
                            Choose Plan
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : selectedStep.type === 'thank-you' ? (
                  <div className="w-full h-full min-h-[600px] bg-gradient-to-br from-amber-50 to-orange-100 dark:from-gray-900 dark:to-amber-900 flex items-center justify-center">
                    <div className="max-w-3xl mx-auto px-8 text-center space-y-8">
                      <div className="w-24 h-24 bg-green-500 rounded-full mx-auto flex items-center justify-center">
                        <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                      <h1 className="text-5xl md:text-6xl font-bold text-gray-900 dark:text-white">
                        {selectedStep.title}
                      </h1>
                      <p className="text-xl md:text-2xl text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">
                        {selectedStep.content}
                      </p>
                      <button className="px-10 py-5 bg-orange-600 text-white font-bold text-lg rounded-xl shadow-xl hover:bg-orange-700 hover:scale-105 transition-all">
                        Continue
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="w-full h-full min-h-[600px] bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 p-16">
                    <div className="max-w-4xl mx-auto text-center space-y-8">
                      <h2 className="text-4xl font-bold text-gray-900 dark:text-white">
                        {selectedStep.title}
                      </h2>
                      <p className="text-xl text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">
                        {selectedStep.content}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center justify-center h-full min-h-[400px] text-muted-foreground">
                <div className="text-center space-y-3">
                  <div className="text-6xl">👈</div>
                  <p className="text-lg">Select a step to see live preview</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Editor */}
        <Card className="overflow-auto max-h-[calc(100vh-200px)]">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Edit Step</span>
              {selectedStep && (
                <Badge variant="secondary" className="text-xs">
                  {selectedStep.type === 'landing' && 'Landing Page'}
                  {selectedStep.type === 'lead-capture' && 'Lead Capture'}
                  {selectedStep.type === 'sales' && 'Sales Page'}
                  {selectedStep.type === 'thank-you' && 'Thank You'}
                  {selectedStep.type === 'affiliate-link' && 'Affiliate Links'}
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {selectedStep ? (
              <>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="step-title">Internal Title</Label>
                    <Input
                      id="step-title"
                      value={selectedStep.title}
                      onChange={(e) => updateStep({ ...selectedStep, title: e.target.value })}
                      placeholder="For your reference only"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      This is only visible to you in the builder
                    </p>
                  </div>

                  <div className="border-t pt-4">
                    {selectedStep.type === 'landing' && (
                      <LandingEditor step={selectedStep} onUpdate={updateStep} />
                    )}
                    {selectedStep.type === 'lead-capture' && (
                      <LeadCaptureEditor step={selectedStep} onUpdate={updateStep} />
                    )}
                    {selectedStep.type === 'sales' && (
                      <SalesEditor step={selectedStep} onUpdate={updateStep} />
                    )}
                    {selectedStep.type === 'thank-you' && (
                      <ThankYouEditor step={selectedStep} onUpdate={updateStep} />
                    )}
                    {selectedStep.type === 'affiliate-link' && (
                      <AffiliateLinkEditor step={selectedStep} onUpdate={updateStep} />
                    )}
                  </div>
                </div>
              </>
            ) : (
              <div className="flex items-center justify-center h-64 text-muted-foreground">
                <div className="text-center space-y-2">
                  <div className="text-4xl">📝</div>
                  <p>Select a step to edit</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Step Type Selection Dialog */}
      <StepTypeDialog
        open={showStepTypeDialog}
        onClose={() => setShowStepTypeDialog(false)}
        onSelect={createStepWithType}
      />
    </div>
  )
}
