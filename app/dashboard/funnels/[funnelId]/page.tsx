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
import { AIContentGenerator } from '@/components/builder/ai-content-generator'
import { CollaboratorPresence } from '@/components/builder/collaborator-presence'
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
    const newStep: FunnelStep = {
      id: `step-${Date.now()}`,
      type: 'landing',
      title: 'New Step',
      content: 'Step content goes here',
      order: steps.length,
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

  const handleAIContentGenerated = (content: { headline: string; body: string; cta: string }) => {
    if (selectedStep) {
      updateStep({
        ...selectedStep,
        title: content.headline,
        content: `${content.body}\n\nCall to Action: ${content.cta}`,
      })
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
    <div className="h-[calc(100vh-4rem)] p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4 flex-1">
          <Link href="/dashboard/funnels">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div className="flex-1 max-w-xl space-y-2">
            <Input
              value={funnelName}
              onChange={(e) => setFunnelName(e.target.value)}
              className="text-2xl font-bold border-none p-0 h-auto focus-visible:ring-0"
              placeholder="Funnel Name"
            />
            <div className="flex items-center gap-2 text-sm">
              <Label className="text-muted-foreground whitespace-nowrap">URL:</Label>
              <div className="flex items-center gap-1 flex-1">
                <span className="text-muted-foreground">yoursite.com/f/</span>
                <Input
                  value={funnelSlug}
                  onChange={(e) => setFunnelSlug(e.target.value)}
                  placeholder="my-funnel"
                  className="h-7 text-sm max-w-xs"
                />
              </div>
            </div>
          </div>
          {isPublic && <Badge variant="secondary">Public</Badge>}
        </div>
        <div className="flex gap-2 items-center">
          <CollaboratorPresence collaborators={collaborators} />
          <Button variant="outline" size="sm" onClick={togglePublic}>
            <Share2 className="w-4 h-4 mr-2" />
            {isPublic ? 'Make Private' : 'Make Public'}
          </Button>
          {isPublic && (
            <Button variant="outline" size="sm" onClick={copyPublicLink}>
              <Copy className="w-4 h-4 mr-2" />
              Copy Link
            </Button>
          )}
          <Button variant="outline" onClick={exportFunnel} disabled={exporting}>
            <Download className="w-4 h-4 mr-2" />
            {exporting ? 'Exporting...' : 'Export HTML'}
          </Button>
          <Button variant="destructive" onClick={deleteFunnel}>
            <Trash2 className="w-4 h-4 mr-2" />
            Delete
          </Button>
          <Button onClick={saveFunnel} disabled={saving}>
            <Save className="w-4 h-4 mr-2" />
            {saving ? 'Saving...' : 'Save'}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-[300px_1fr_350px] gap-6 h-full">
        {/* Steps List */}
        <Card className="overflow-auto">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
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
        <Card className="overflow-auto flex flex-col">
          <CardHeader className="border-b">
            <CardTitle>Live Preview</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 p-0">
            {selectedStep ? (
              <div className="h-full">
                {selectedStep.type === 'affiliate-link' ? (
                  <div 
                    className="w-full h-full min-h-[600px] flex flex-col items-center justify-center text-center px-8"
                    style={{
                      backgroundColor: selectedStep.backgroundColor || '#6366f1',
                      backgroundImage: selectedStep.backgroundImage 
                        ? `linear-gradient(rgba(0,0,0,0.4), rgba(0,0,0,0.4)), url(${selectedStep.backgroundImage})`
                        : 'none',
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                      color: selectedStep.textColor || '#ffffff',
                    }}
                  >
                    <div className="space-y-8 max-w-3xl w-full">
                      <h1 className="text-5xl md:text-6xl font-bold leading-tight drop-shadow-lg">
                        {selectedStep.title}
                      </h1>
                      <p className="text-xl md:text-2xl whitespace-pre-wrap opacity-95 leading-relaxed drop-shadow">
                        {selectedStep.content}
                      </p>
                      <div className="space-y-4 max-w-xl mx-auto">
                        {(selectedStep.affiliateLinks && selectedStep.affiliateLinks.length > 0) ? (
                          selectedStep.affiliateLinks.map((link) => (
                            <a
                              key={link.id}
                              href={link.url || '#'}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center justify-center gap-3 px-8 py-4 bg-white text-gray-900 font-bold text-lg rounded-xl shadow-2xl hover:scale-105 hover:shadow-3xl transition-all duration-200"
                              onClick={(e) => e.preventDefault()}
                            >
                              {link.icon && <span className="text-2xl">{link.icon}</span>}
                              <span>{link.buttonText}</span>
                            </a>
                          ))
                        ) : (
                          <div className="text-sm opacity-75">
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
        <Card className="overflow-auto">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Edit Step</CardTitle>
              {selectedStep && (
                <AIContentGenerator
                  onContentGenerated={handleAIContentGenerated}
                  stepType={selectedStep.type}
                  currentContent={selectedStep.content}
                />
              )}
            </div>
          </CardHeader>
          <CardContent>
            {selectedStep ? (
              <div className="space-y-4">
                <div>
                  <Label htmlFor="step-type">Step Type</Label>
                  <Select
                    value={selectedStep.type}
                    onValueChange={(value: any) => updateStep({ ...selectedStep, type: value })}
                  >
                    <SelectTrigger id="step-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="landing">Landing Page</SelectItem>
                      <SelectItem value="lead-capture">Lead Capture</SelectItem>
                      <SelectItem value="sales">Sales Page</SelectItem>
                      <SelectItem value="thank-you">Thank You Page</SelectItem>
                      <SelectItem value="affiliate-link">Affiliate Link Page</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="step-title">Title</Label>
                  <Input
                    id="step-title"
                    value={selectedStep.title}
                    onChange={(e) => updateStep({ ...selectedStep, title: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="step-content">Content</Label>
                  <Textarea
                    id="step-content"
                    value={selectedStep.content}
                    onChange={(e) => updateStep({ ...selectedStep, content: e.target.value })}
                    rows={10}
                  />
                </div>

                {/* Affiliate Link Fields */}
                {selectedStep.type === 'affiliate-link' && (
                  <>
                    <div>
                      <Label htmlFor="bg-color">Background Color</Label>
                      <div className="flex gap-2">
                        <Input
                          id="bg-color"
                          type="color"
                          value={selectedStep.backgroundColor || '#6366f1'}
                          onChange={(e) => updateStep({ ...selectedStep, backgroundColor: e.target.value })}
                          className="w-20 h-10"
                        />
                        <Input
                          type="text"
                          value={selectedStep.backgroundColor || '#6366f1'}
                          onChange={(e) => updateStep({ ...selectedStep, backgroundColor: e.target.value })}
                          placeholder="#6366f1"
                        />
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="text-color">Text Color</Label>
                      <div className="flex gap-2">
                        <Input
                          id="text-color"
                          type="color"
                          value={selectedStep.textColor || '#ffffff'}
                          onChange={(e) => updateStep({ ...selectedStep, textColor: e.target.value })}
                          className="w-20 h-10"
                        />
                        <Input
                          type="text"
                          value={selectedStep.textColor || '#ffffff'}
                          onChange={(e) => updateStep({ ...selectedStep, textColor: e.target.value })}
                          placeholder="#ffffff"
                        />
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="bg-image">Background Image URL (optional)</Label>
                      <Input
                        id="bg-image"
                        type="url"
                        placeholder="https://images.unsplash.com/photo-..."
                        value={selectedStep.backgroundImage || ''}
                        onChange={(e) => updateStep({ ...selectedStep, backgroundImage: e.target.value })}
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Use a high-quality image URL from Unsplash, Pexels, or your own hosting
                      </p>
                    </div>

                    <div className="border-t pt-4 mt-4">
                      <div className="flex items-center justify-between mb-3">
                        <Label>Affiliate Links</Label>
                        <Button
                          size="sm"
                          onClick={() => {
                            const newLinks = [...(selectedStep.affiliateLinks || []), {
                              id: `link-${Date.now()}`,
                              url: '',
                              buttonText: 'New Link',
                              icon: '🔗'
                            }]
                            updateStep({ ...selectedStep, affiliateLinks: newLinks })
                          }}
                        >
                          <Plus className="w-4 h-4 mr-1" />
                          Add Link
                        </Button>
                      </div>
                      
                      <div className="space-y-4">
                        {(selectedStep.affiliateLinks || []).map((link, index) => (
                          <Card key={link.id} className="p-4">
                            <div className="space-y-3">
                              <div className="flex items-center justify-between">
                                <Label className="text-sm font-semibold">Link {index + 1}</Label>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => {
                                    const newLinks = selectedStep.affiliateLinks?.filter(l => l.id !== link.id) || []
                                    updateStep({ ...selectedStep, affiliateLinks: newLinks })
                                  }}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                              <div>
                                <Label className="text-xs">URL</Label>
                                <Input
                                  type="url"
                                  placeholder="https://example.com/affiliate"
                                  value={link.url}
                                  onChange={(e) => {
                                    const newLinks = selectedStep.affiliateLinks?.map(l => 
                                      l.id === link.id ? { ...l, url: e.target.value } : l
                                    ) || []
                                    updateStep({ ...selectedStep, affiliateLinks: newLinks })
                                  }}
                                />
                              </div>
                              <div>
                                <Label className="text-xs">Button Text</Label>
                                <Input
                                  placeholder="Click here"
                                  value={link.buttonText}
                                  onChange={(e) => {
                                    const newLinks = selectedStep.affiliateLinks?.map(l => 
                                      l.id === link.id ? { ...l, buttonText: e.target.value } : l
                                    ) || []
                                    updateStep({ ...selectedStep, affiliateLinks: newLinks })
                                  }}
                                />
                              </div>
                              <div>
                                <Label className="text-xs">Icon (emoji)</Label>
                                <Input
                                  placeholder="🚀"
                                  value={link.icon || ''}
                                  onChange={(e) => {
                                    const newLinks = selectedStep.affiliateLinks?.map(l => 
                                      l.id === link.id ? { ...l, icon: e.target.value } : l
                                    ) || []
                                    updateStep({ ...selectedStep, affiliateLinks: newLinks })
                                  }}
                                  maxLength={4}
                                />
                                <p className="text-xs text-muted-foreground mt-1">
                                  Use emoji or leave blank
                                </p>
                              </div>
                            </div>
                          </Card>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <div className="flex items-center justify-center h-64 text-muted-foreground">
                Select a step to edit
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
