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
import type { FunnelStep } from '@/data/templates'
import { RealtimeCollaboration, Collaborator } from '@/lib/realtime-collaboration'
import { Badge } from '@/components/ui/badge'

export default function FunnelBuilderPage() {
  const params = useParams()
  const router = useRouter()
  const supabase = createClient()
  const [funnel, setFunnel] = useState<any>(null)
  const [funnelName, setFunnelName] = useState('')
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
    const { error } = await (supabase
      .from('funnels') as any)
      .update({ name: funnelName, steps, is_public: isPublic })
      .eq('id', params.funnelId as string)

    if (error) {
      console.error('Error saving funnel:', error)
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
    const link = `${window.location.origin}/public/${params.funnelId}`
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
        <div className="flex items-center gap-4">
          <Link href="/dashboard/funnels">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div>
            <Input
              value={funnelName}
              onChange={(e) => setFunnelName(e.target.value)}
              className="text-2xl font-bold border-none p-0 h-auto focus-visible:ring-0"
            />
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
        <Card className="overflow-auto">
          <CardHeader>
            <CardTitle>Preview</CardTitle>
          </CardHeader>
          <CardContent>
            {selectedStep ? (
              <div className="space-y-4">
                {selectedStep.type === 'affiliate-link' ? (
                  <div 
                    className="p-8 border rounded-lg min-h-[400px] flex flex-col items-center justify-center text-center"
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
                    <div className="space-y-6 max-w-2xl">
                      <h2 className="text-4xl font-bold">{selectedStep.title}</h2>
                      <p className="text-xl whitespace-pre-wrap opacity-90">{selectedStep.content}</p>
                      <a
                        href={selectedStep.affiliateUrl || '#'}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-block px-8 py-4 bg-white text-gray-900 font-semibold rounded-lg hover:scale-105 transition-transform"
                        onClick={(e) => e.preventDefault()}
                      >
                        {selectedStep.buttonText || 'Click Here'}
                      </a>
                      <p className="text-sm opacity-75">
                        {selectedStep.affiliateUrl ? `→ ${selectedStep.affiliateUrl}` : 'Add your affiliate URL'}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="p-8 border rounded-lg bg-muted/50">
                    <div className="text-center space-y-4">
                      <h2 className="text-3xl font-bold">{selectedStep.title}</h2>
                      <p className="text-lg whitespace-pre-wrap">{selectedStep.content}</p>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center justify-center h-64 text-muted-foreground">
                Select a step to preview
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
                      <Label htmlFor="affiliate-url">Affiliate URL</Label>
                      <Input
                        id="affiliate-url"
                        type="url"
                        placeholder="https://example.com/affiliate?ref=yourcode"
                        value={selectedStep.affiliateUrl || ''}
                        onChange={(e) => updateStep({ ...selectedStep, affiliateUrl: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="button-text">Button Text</Label>
                      <Input
                        id="button-text"
                        placeholder="Get Started Now"
                        value={selectedStep.buttonText || 'Click Here'}
                        onChange={(e) => updateStep({ ...selectedStep, buttonText: e.target.value })}
                      />
                    </div>
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
