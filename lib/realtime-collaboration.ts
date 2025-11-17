import { createClient } from '@/lib/supabase'
import { RealtimeChannel } from '@supabase/supabase-js'

export interface Collaborator {
  id: string
  email: string
  color: string
}

export class RealtimeCollaboration {
  private channel: RealtimeChannel | null = null
  private funnelId: string
  private userId: string
  private userEmail: string

  constructor(funnelId: string, userId: string, userEmail: string) {
    this.funnelId = funnelId
    this.userId = userId
    this.userEmail = userEmail
  }

  async connect(
    onPresenceUpdate: (collaborators: Collaborator[]) => void,
    onFunnelUpdate: (steps: any[]) => void
  ) {
    const supabase = createClient()

    this.channel = supabase.channel(`funnel:${this.funnelId}`, {
      config: {
        presence: {
          key: this.userId,
        },
      },
    })

    // Track presence
    this.channel
      .on('presence', { event: 'sync' }, () => {
        const state = this.channel?.presenceState()
        const collaborators: Collaborator[] = []

        if (state) {
          Object.values(state).forEach((presences: any) => {
            presences.forEach((presence: any) => {
              collaborators.push({
                id: presence.userId,
                email: presence.email,
                color: presence.color,
              })
            })
          })
        }

        onPresenceUpdate(collaborators)
      })
      .on('broadcast', { event: 'funnel-update' }, ({ payload }) => {
        if (payload.userId !== this.userId) {
          onFunnelUpdate(payload.steps)
        }
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          // Generate random color for this user
          const colors = ['#EF4444', '#F59E0B', '#10B981', '#3B82F6', '#8B5CF6', '#EC4899']
          const color = colors[Math.floor(Math.random() * colors.length)]

          await this.channel?.track({
            userId: this.userId,
            email: this.userEmail,
            color,
            online_at: new Date().toISOString(),
          })
        }
      })
  }

  async broadcastUpdate(steps: any[]) {
    if (this.channel) {
      await this.channel.send({
        type: 'broadcast',
        event: 'funnel-update',
        payload: {
          userId: this.userId,
          steps,
        },
      })
    }
  }

  async disconnect() {
    if (this.channel) {
      await this.channel.unsubscribe()
      this.channel = null
    }
  }
}
