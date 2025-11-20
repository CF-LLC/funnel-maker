'use client'

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Card } from '@/components/ui/card'
import { FileText, Users, DollarSign, CheckCircle, ExternalLink } from 'lucide-react'

type StepType = 'landing' | 'lead-capture' | 'sales' | 'thank-you' | 'affiliate-link'

type StepTypeOption = {
  value: StepType
  label: string
  description: string
  icon: React.ReactNode
  color: string
}

const stepTypes: StepTypeOption[] = [
  {
    value: 'landing',
    label: 'Landing Page',
    description: 'Introduce your offer with a compelling headline and call-to-action',
    icon: <FileText className="w-6 h-6" />,
    color: 'text-blue-600'
  },
  {
    value: 'lead-capture',
    label: 'Lead Capture',
    description: 'Collect email addresses and contact information from visitors',
    icon: <Users className="w-6 h-6" />,
    color: 'text-purple-600'
  },
  {
    value: 'sales',
    label: 'Sales Page',
    description: 'Present your pricing and product details to drive purchases',
    icon: <DollarSign className="w-6 h-6" />,
    color: 'text-green-600'
  },
  {
    value: 'thank-you',
    label: 'Thank You Page',
    description: 'Confirm success and provide next steps to your customers',
    icon: <CheckCircle className="w-6 h-6" />,
    color: 'text-amber-600'
  },
  {
    value: 'affiliate-link',
    label: 'Affiliate Links',
    description: 'Beautiful page with multiple styled affiliate link buttons',
    icon: <ExternalLink className="w-6 h-6" />,
    color: 'text-pink-600'
  }
]

interface StepTypeDialogProps {
  open: boolean
  onClose: () => void
  onSelect: (type: StepType) => void
}

export function StepTypeDialog({ open, onClose, onSelect }: StepTypeDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">Choose Step Type</DialogTitle>
          <DialogDescription>
            Select the type of step you want to add to your funnel. This cannot be changed later.
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid sm:grid-cols-2 gap-4 mt-4">
          {stepTypes.map((stepType) => (
            <Card
              key={stepType.value}
              className="p-6 cursor-pointer hover:border-primary hover:shadow-lg transition-all"
              onClick={() => {
                onSelect(stepType.value)
                onClose()
              }}
            >
              <div className="flex items-start gap-4">
                <div className={`${stepType.color} shrink-0 mt-1`}>
                  {stepType.icon}
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-lg mb-1">{stepType.label}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {stepType.description}
                  </p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}
