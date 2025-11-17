'use client'

import { Users } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Collaborator } from '@/lib/realtime-collaboration'

interface CollaboratorPresenceProps {
  collaborators: Collaborator[]
}

export function CollaboratorPresence({ collaborators }: CollaboratorPresenceProps) {
  if (collaborators.length === 0) {
    return null
  }

  return (
    <div className="flex items-center gap-2 px-4 py-2 bg-muted rounded-lg">
      <Users className="w-4 h-4" />
      <span className="text-sm font-medium">
        {collaborators.length} {collaborators.length === 1 ? 'collaborator' : 'collaborators'} online
      </span>
      <div className="flex gap-1 ml-2">
        {collaborators.slice(0, 5).map((collaborator) => (
          <Badge
            key={collaborator.id}
            variant="secondary"
            style={{ backgroundColor: `${collaborator.color}20`, borderColor: collaborator.color }}
            className="border"
          >
            {collaborator.email.charAt(0).toUpperCase()}
          </Badge>
        ))}
        {collaborators.length > 5 && (
          <Badge variant="secondary">+{collaborators.length - 5}</Badge>
        )}
      </div>
    </div>
  )
}
