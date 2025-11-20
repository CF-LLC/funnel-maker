'use client'

import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Plus, Trash2 } from 'lucide-react'
import type { FunnelStep, AffiliateLink } from '@/data/templates'

interface StepEditorProps {
  step: FunnelStep
  onUpdate: (step: FunnelStep) => void
}

// Landing Page Editor
export function LandingEditor({ step, onUpdate }: StepEditorProps) {
  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="headline">Headline</Label>
        <Input
          id="headline"
          value={step.headline || step.title}
          onChange={(e) => onUpdate({ ...step, headline: e.target.value })}
          placeholder="Transform Your Life in 30 Days"
        />
      </div>
      
      <div>
        <Label htmlFor="subheadline">Subheadline</Label>
        <Input
          id="subheadline"
          value={step.subheadline || ''}
          onChange={(e) => onUpdate({ ...step, subheadline: e.target.value })}
          placeholder="Join 10,000+ successful customers"
        />
      </div>

      <div>
        <Label htmlFor="content">Content/Description</Label>
        <Textarea
          id="content"
          value={step.content}
          onChange={(e) => onUpdate({ ...step, content: e.target.value })}
          rows={8}
          placeholder="Describe your offer, benefits, and value proposition..."
        />
      </div>

      <div>
        <Label htmlFor="cta-text">Call-to-Action Button Text</Label>
        <Input
          id="cta-text"
          value={step.ctaText || 'Get Started'}
          onChange={(e) => onUpdate({ ...step, ctaText: e.target.value })}
          placeholder="Get Started Now"
        />
      </div>

      <div>
        <Label htmlFor="cta-url">Button URL (optional)</Label>
        <Input
          id="cta-url"
          type="url"
          value={step.ctaUrl || ''}
          onChange={(e) => onUpdate({ ...step, ctaUrl: e.target.value })}
          placeholder="https://example.com or leave blank for next step"
        />
      </div>

      <div className="border-t pt-4">
        <Label className="mb-2 block">Features List (optional)</Label>
        <Textarea
          value={(step.features || []).join('\n')}
          onChange={(e) => onUpdate({ ...step, features: e.target.value.split('\n').filter(f => f.trim()) })}
          rows={5}
          placeholder="Enter one feature per line:&#10;Feature 1&#10;Feature 2&#10;Feature 3"
        />
        <p className="text-xs text-muted-foreground mt-1">
          Each line will be displayed as a bullet point
        </p>
      </div>

      <div className="border-t pt-4">
        <Label className="mb-2 block">Testimonials (optional)</Label>
        <Textarea
          value={(step.testimonials || []).join('\n')}
          onChange={(e) => onUpdate({ ...step, testimonials: e.target.value.split('\n').filter(t => t.trim()) })}
          rows={4}
          placeholder="Enter one testimonial per line:&#10;This changed my life! - John D.&#10;Amazing results! - Sarah M."
        />
        <p className="text-xs text-muted-foreground mt-1">
          Each line will be displayed as a separate testimonial
        </p>
      </div>
    </div>
  )
}

// Lead Capture Editor
export function LeadCaptureEditor({ step, onUpdate }: StepEditorProps) {
  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="headline">Form Headline</Label>
        <Input
          id="headline"
          value={step.headline || step.title}
          onChange={(e) => onUpdate({ ...step, headline: e.target.value })}
          placeholder="Enter Your Details"
        />
      </div>

      <div>
        <Label htmlFor="content">Form Description</Label>
        <Textarea
          id="content"
          value={step.content}
          onChange={(e) => onUpdate({ ...step, content: e.target.value })}
          rows={4}
          placeholder="Tell visitors what they'll receive after submitting..."
        />
      </div>

      <div>
        <Label htmlFor="cta-text">Submit Button Text</Label>
        <Input
          id="cta-text"
          value={step.ctaText || 'Submit'}
          onChange={(e) => onUpdate({ ...step, ctaText: e.target.value })}
          placeholder="Get Free Access"
        />
      </div>

      <div className="border-t pt-4">
        <Label className="mb-2 block">Form Fields</Label>
        <div className="space-y-2">
          {['Name', 'Email', 'Phone', 'Company'].map((field) => {
            const fieldKey = field.toLowerCase()
            const isSelected = step.formFields?.includes(fieldKey) || false
            
            return (
              <label key={field} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={(e) => {
                    const currentFields = step.formFields || []
                    const newFields = e.target.checked
                      ? [...currentFields, fieldKey]
                      : currentFields.filter(f => f !== fieldKey)
                    onUpdate({ ...step, formFields: newFields })
                  }}
                  className="w-4 h-4 rounded border-gray-300"
                />
                <span>{field}</span>
              </label>
            )
          })}
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          Select which fields to show in the form
        </p>
      </div>
    </div>
  )
}

// Sales Page Editor
export function SalesEditor({ step, onUpdate }: StepEditorProps) {
  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="headline">Sales Headline</Label>
        <Input
          id="headline"
          value={step.headline || step.title}
          onChange={(e) => onUpdate({ ...step, headline: e.target.value })}
          placeholder="Special Offer - Limited Time!"
        />
      </div>

      <div>
        <Label htmlFor="subheadline">Subheadline</Label>
        <Input
          id="subheadline"
          value={step.subheadline || ''}
          onChange={(e) => onUpdate({ ...step, subheadline: e.target.value })}
          placeholder="Save 50% when you act now"
        />
      </div>

      <div>
        <Label htmlFor="content">Sales Copy</Label>
        <Textarea
          id="content"
          value={step.content}
          onChange={(e) => onUpdate({ ...step, content: e.target.value })}
          rows={10}
          placeholder="Describe your offer, value, and why they should buy now..."
        />
      </div>

      <div className="border-t pt-4">
        <Label className="text-base font-semibold mb-3 block">Pricing</Label>
        
        <div className="grid grid-cols-3 gap-3">
          <div>
            <Label htmlFor="amount">Price</Label>
            <Input
              id="amount"
              value={step.pricing?.amount || ''}
              onChange={(e) => onUpdate({ 
                ...step, 
                pricing: { ...step.pricing, amount: e.target.value, currency: step.pricing?.currency || 'USD' }
              })}
              placeholder="$99"
            />
          </div>
          
          <div>
            <Label htmlFor="currency">Currency</Label>
            <Input
              id="currency"
              value={step.pricing?.currency || 'USD'}
              onChange={(e) => onUpdate({ 
                ...step, 
                pricing: { ...step.pricing, amount: step.pricing?.amount || '', currency: e.target.value }
              })}
              placeholder="USD"
            />
          </div>
          
          <div>
            <Label htmlFor="interval">Interval</Label>
            <Select
              value={step.pricing?.interval || 'one-time'}
              onValueChange={(value) => onUpdate({ 
                ...step, 
                pricing: { ...step.pricing, amount: step.pricing?.amount || '', currency: step.pricing?.currency || 'USD', interval: value }
              })}
            >
              <SelectTrigger id="interval">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="one-time">One-time</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
                <SelectItem value="yearly">Yearly</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div>
        <Label htmlFor="cta-text">Buy Button Text</Label>
        <Input
          id="cta-text"
          value={step.ctaText || 'Buy Now'}
          onChange={(e) => onUpdate({ ...step, ctaText: e.target.value })}
          placeholder="Get Instant Access"
        />
      </div>

      <div className="border-t pt-4">
        <Label className="mb-2 block">What's Included (optional)</Label>
        <Textarea
          value={(step.features || []).join('\n')}
          onChange={(e) => onUpdate({ ...step, features: e.target.value.split('\n').filter(f => f.trim()) })}
          rows={5}
          placeholder="Enter one feature per line:&#10;Lifetime access&#10;All updates included&#10;Priority support"
        />
      </div>
    </div>
  )
}

// Thank You Page Editor
export function ThankYouEditor({ step, onUpdate }: StepEditorProps) {
  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="headline">Success Headline</Label>
        <Input
          id="headline"
          value={step.headline || step.title}
          onChange={(e) => onUpdate({ ...step, headline: e.target.value })}
          placeholder="Success! Thank You"
        />
      </div>

      <div>
        <Label htmlFor="content">Thank You Message</Label>
        <Textarea
          id="content"
          value={step.content}
          onChange={(e) => onUpdate({ ...step, content: e.target.value })}
          rows={8}
          placeholder="Thank you for your purchase! Check your email for next steps..."
        />
      </div>

      <div>
        <Label htmlFor="cta-text">Next Step Button Text</Label>
        <Input
          id="cta-text"
          value={step.ctaText || 'Continue'}
          onChange={(e) => onUpdate({ ...step, ctaText: e.target.value })}
          placeholder="Access Your Account"
        />
      </div>

      <div>
        <Label htmlFor="cta-url">Button URL</Label>
        <Input
          id="cta-url"
          type="url"
          value={step.ctaUrl || ''}
          onChange={(e) => onUpdate({ ...step, ctaUrl: e.target.value })}
          placeholder="/dashboard or external URL"
        />
      </div>
    </div>
  )
}

// Affiliate Link Page Editor
export function AffiliateLinkEditor({ step, onUpdate }: StepEditorProps) {
  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="headline">Page Headline</Label>
        <Input
          id="headline"
          value={step.headline || step.title}
          onChange={(e) => onUpdate({ ...step, headline: e.target.value })}
          placeholder="My Favorite Tools & Resources"
        />
      </div>

      <div>
        <Label htmlFor="content">Description</Label>
        <Textarea
          id="content"
          value={step.content}
          onChange={(e) => onUpdate({ ...step, content: e.target.value })}
          rows={4}
          placeholder="Introduce your affiliate links and why you recommend them..."
        />
      </div>

      <div>
        <Label>Background Style</Label>
        <div className="grid grid-cols-3 gap-2 mt-2">
          <button
            onClick={() => onUpdate({ ...step, backgroundColor: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', backgroundImage: '' })}
            className="h-12 rounded-md bg-gradient-to-br from-[#667eea] to-[#764ba2] border-2 border-transparent hover:border-primary"
            title="Purple Dream"
          />
          <button
            onClick={() => onUpdate({ ...step, backgroundColor: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)', backgroundImage: '' })}
            className="h-12 rounded-md bg-gradient-to-br from-[#f093fb] to-[#f5576c] border-2 border-transparent hover:border-primary"
            title="Pink Passion"
          />
          <button
            onClick={() => onUpdate({ ...step, backgroundColor: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)', backgroundImage: '' })}
            className="h-12 rounded-md bg-gradient-to-br from-[#4facfe] to-[#00f2fe] border-2 border-transparent hover:border-primary"
            title="Ocean Blue"
          />
          <button
            onClick={() => onUpdate({ ...step, backgroundColor: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)', backgroundImage: '' })}
            className="h-12 rounded-md bg-gradient-to-br from-[#43e97b] to-[#38f9d7] border-2 border-transparent hover:border-primary"
            title="Fresh Green"
          />
          <button
            onClick={() => onUpdate({ ...step, backgroundColor: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)', backgroundImage: '' })}
            className="h-12 rounded-md bg-gradient-to-br from-[#fa709a] to-[#fee140] border-2 border-transparent hover:border-primary"
            title="Sunset"
          />
          <button
            onClick={() => onUpdate({ ...step, backgroundColor: 'linear-gradient(135deg, #30cfd0 0%, #330867 100%)', backgroundImage: '' })}
            className="h-12 rounded-md bg-gradient-to-br from-[#30cfd0] to-[#330867] border-2 border-transparent hover:border-primary"
            title="Deep Ocean"
          />
          <button
            onClick={() => onUpdate({ ...step, backgroundColor: 'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)', backgroundImage: '' })}
            className="h-12 rounded-md bg-gradient-to-br from-[#a8edea] to-[#fed6e3] border-2 border-transparent hover:border-primary"
            title="Cotton Candy"
          />
          <button
            onClick={() => onUpdate({ ...step, backgroundColor: 'linear-gradient(135deg, #ff9a56 0%, #ff6a88 100%)', backgroundImage: '' })}
            className="h-12 rounded-md bg-gradient-to-br from-[#ff9a56] to-[#ff6a88] border-2 border-transparent hover:border-primary"
            title="Coral"
          />
          <button
            onClick={() => onUpdate({ ...step, backgroundColor: 'linear-gradient(135deg, #1e3c72 0%, #2a5298 100%)', backgroundImage: '' })}
            className="h-12 rounded-md bg-gradient-to-br from-[#1e3c72] to-[#2a5298] border-2 border-transparent hover:border-primary"
            title="Navy Blue"
          />
          <button
            onClick={() => onUpdate({ ...step, backgroundColor: 'linear-gradient(135deg, #ee0979 0%, #ff6a00 100%)', backgroundImage: '' })}
            className="h-12 rounded-md bg-gradient-to-br from-[#ee0979] to-[#ff6a00] border-2 border-transparent hover:border-primary"
            title="Burning Orange"
          />
          <button
            onClick={() => onUpdate({ ...step, backgroundColor: 'linear-gradient(135deg, #3a1c71 0%, #d76d77 50%, #ffaf7b 100%)', backgroundImage: '' })}
            className="h-12 rounded-md bg-gradient-to-br from-[#3a1c71] via-[#d76d77] to-[#ffaf7b] border-2 border-transparent hover:border-primary"
            title="Royal Sunset"
          />
          <button
            onClick={() => onUpdate({ ...step, backgroundColor: 'linear-gradient(135deg, #0f2027 0%, #203a43 50%, #2c5364 100%)', backgroundImage: '' })}
            className="h-12 rounded-md bg-gradient-to-br from-[#0f2027] via-[#203a43] to-[#2c5364] border-2 border-transparent hover:border-primary"
            title="Dark Night"
          />
        </div>
      </div>

      <div>
        <Label htmlFor="bg-color">Custom Background Color</Label>
        <div className="flex gap-2">
          <Input
            id="bg-color"
            type="color"
            value={step.backgroundColor?.startsWith('#') ? step.backgroundColor : '#6366f1'}
            onChange={(e) => onUpdate({ ...step, backgroundColor: e.target.value })}
            className="w-20 h-10"
          />
          <Input
            type="text"
            value={step.backgroundColor || '#6366f1'}
            onChange={(e) => onUpdate({ ...step, backgroundColor: e.target.value })}
            placeholder="#6366f1 or CSS gradient"
          />
        </div>
      </div>

      <div>
        <Label htmlFor="text-color">Text Color</Label>
        <div className="flex gap-2">
          <Input
            id="text-color"
            type="color"
            value={step.textColor || '#ffffff'}
            onChange={(e) => onUpdate({ ...step, textColor: e.target.value })}
            className="w-20 h-10"
          />
          <Input
            type="text"
            value={step.textColor || '#ffffff'}
            onChange={(e) => onUpdate({ ...step, textColor: e.target.value })}
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
          value={step.backgroundImage || ''}
          onChange={(e) => onUpdate({ ...step, backgroundImage: e.target.value })}
        />
        <p className="text-xs text-muted-foreground mt-1">
          Use a high-quality image URL
        </p>
      </div>

      <div>
        <Label>Button Style</Label>
        <Select
          value={step.buttonStyle || 'modern'}
          onValueChange={(value: any) => onUpdate({ ...step, buttonStyle: value })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="modern">Modern (Rounded)</SelectItem>
            <SelectItem value="sharp">Sharp (Square)</SelectItem>
            <SelectItem value="pill">Pill (Full Round)</SelectItem>
            <SelectItem value="gradient">Gradient</SelectItem>
            <SelectItem value="outline">Outline</SelectItem>
            <SelectItem value="glass">Glass</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="border-t pt-4 mt-4">
        <div className="flex items-center justify-between mb-3">
          <Label>Affiliate Links</Label>
          <Button
            size="sm"
            onClick={() => {
              const newLinks = [...(step.affiliateLinks || []), {
                id: `link-${Date.now()}`,
                url: '',
                buttonText: 'New Link',
                icon: '🔗'
              }]
              onUpdate({ ...step, affiliateLinks: newLinks })
            }}
          >
            <Plus className="w-4 h-4 mr-1" />
            Add Link
          </Button>
        </div>
        
        <div className="space-y-4">
          {(step.affiliateLinks || []).map((link, index) => (
            <Card key={link.id} className="p-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-semibold">Link {index + 1}</Label>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      const newLinks = step.affiliateLinks?.filter(l => l.id !== link.id) || []
                      onUpdate({ ...step, affiliateLinks: newLinks })
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
                      const newLinks = step.affiliateLinks?.map(l => 
                        l.id === link.id ? { ...l, url: e.target.value } : l
                      ) || []
                      onUpdate({ ...step, affiliateLinks: newLinks })
                    }}
                  />
                </div>
                <div>
                  <Label className="text-xs">Button Text</Label>
                  <Input
                    placeholder="Click here"
                    value={link.buttonText}
                    onChange={(e) => {
                      const newLinks = step.affiliateLinks?.map(l => 
                        l.id === link.id ? { ...l, buttonText: e.target.value } : l
                      ) || []
                      onUpdate({ ...step, affiliateLinks: newLinks })
                    }}
                  />
                </div>
                <div>
                  <Label className="text-xs">Icon (emoji)</Label>
                  <Input
                    placeholder="🚀"
                    value={link.icon || ''}
                    onChange={(e) => {
                      const newLinks = step.affiliateLinks?.map(l => 
                        l.id === link.id ? { ...l, icon: e.target.value } : l
                      ) || []
                      onUpdate({ ...step, affiliateLinks: newLinks })
                    }}
                    maxLength={4}
                  />
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}
