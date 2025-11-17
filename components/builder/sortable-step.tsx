'use client'

import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { GripVertical, Trash2 } from 'lucide-react'
import type { FunnelStep } from '@/data/templates'

interface SortableStepProps {
  step: FunnelStep
  isSelected: boolean
  onClick: () => void
  onDelete: () => void
}

export function SortableStep({ step, isSelected, onClick, onDelete }: SortableStepProps) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: step.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  const getStepColor = (type: string) => {
    switch (type) {
      case 'landing':
        return 'bg-blue-100 text-blue-700'
      case 'lead-capture':
        return 'bg-green-100 text-green-700'
      case 'sales':
        return 'bg-purple-100 text-purple-700'
      case 'thank-you':
        return 'bg-orange-100 text-orange-700'
      case 'affiliate-link':
        return 'bg-pink-100 text-pink-700'
      default:
        return 'bg-gray-100 text-gray-700'
    }
  }

  return (
    <div ref={setNodeRef} style={style}>
      <Card
        className={`p-3 cursor-pointer hover:border-primary transition-colors ${
          isSelected ? 'border-primary bg-primary/5' : ''
        }`}
        onClick={onClick}
      >
        <div className="flex items-center gap-2">
          <button {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing">
            <GripVertical className="w-4 h-4 text-muted-foreground" />
          </button>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className={`text-xs px-2 py-0.5 rounded-full ${getStepColor(step.type)}`}>
                {step.order + 1}
              </span>
            </div>
            <p className="font-medium text-sm truncate">{step.title}</p>
          </div>
          <Button
            size="icon"
            variant="ghost"
            onClick={(e) => {
              e.stopPropagation()
              onDelete()
            }}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </Card>
    </div>
  )
}
