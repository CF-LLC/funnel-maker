'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { Button } from '@/components/ui/button'

export function NewFormButton({ userId }: { userId: string }) {
  const router = useRouter()
  const [err, setErr] = useState('')
  async function create() {
    setErr('')
    const slug = `form-${Date.now().toString(36)}`
    const fields = [
      { id: 'name', type: 'short_text', label: 'Name', required: true },
      { id: 'email', type: 'email', label: 'Email', required: true },
      { id: 'message', type: 'long_text', label: 'Message', required: false },
    ]
    const { data, error } = await (createClient() as any).from('frm_forms').insert({ user_id: userId, slug, title: 'Contact form', fields }).select('id').single()
    if (error) return setErr(error.message)
    router.push(`/forms/${data.id}`)
  }
  return <div className="text-right"><Button onClick={create}>New form</Button>{err && <p className="text-xs text-red-600">{err}</p>}</div>
}
