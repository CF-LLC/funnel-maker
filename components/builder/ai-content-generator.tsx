'use client'

import { useState } from 'react'
import { Wand2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

interface AIContentGeneratorProps {
  onContentGenerated: (content: { headline: string; body: string; cta: string }) => void
  stepType?: string
  currentContent?: string
}

export function AIContentGenerator({
  onContentGenerated,
  stepType = 'landing page',
  currentContent,
}: AIContentGeneratorProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [instructions, setInstructions] = useState('')
  const [targetAudience, setTargetAudience] = useState('')
  const [generating, setGenerating] = useState(false)

  const handleGenerate = async () => {
    setGenerating(true)

    try {
      const res = await fetch('/api/ai/step', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stepType,
          currentContent,
          instructions,
          targetAudience,
        }),
      })

      const data = await res.json()

      if (res.ok && data.content) {
        onContentGenerated(data.content)
        setIsOpen(false)
        setInstructions('')
        setTargetAudience('')
      } else {
        alert(data.error || 'Failed to generate content')
      }
    } catch (error) {
      console.error('Error generating content:', error)
      alert('Failed to generate content')
    } finally {
      setGenerating(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Wand2 className="w-4 h-4 mr-2" />
          Generate with AI
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>AI Content Generator</DialogTitle>
          <DialogDescription>
            Let AI help you create compelling content for your funnel step.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="audience">Target Audience (Optional)</Label>
            <Input
              id="audience"
              value={targetAudience}
              onChange={(e) => setTargetAudience(e.target.value)}
              placeholder="e.g., Small business owners, fitness enthusiasts..."
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="instructions">Instructions</Label>
            <Textarea
              id="instructions"
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              placeholder="e.g., Make it more persuasive, focus on benefits, use emotional language..."
              rows={4}
              required
            />
          </div>
        </div>
        <DialogFooter>
          <Button onClick={handleGenerate} disabled={generating || !instructions}>
            {generating ? 'Generating...' : 'Generate Content'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
