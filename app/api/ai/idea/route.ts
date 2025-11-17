import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

const OPENAI_API_KEY = process.env.OPENAI_API_KEY

export async function POST(request: Request) {
  const supabase = await createServerClient()

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!OPENAI_API_KEY) {
    return NextResponse.json({ error: 'OpenAI API key not configured' }, { status: 500 })
  }

  try {
    const { targetAudience, offer } = await request.json()

    const prompt = `Generate a creative funnel idea for the following:
Target Audience: ${targetAudience}
Offer: ${offer}

Provide a funnel name and a brief description of the funnel strategy (3-4 steps).
Format your response as JSON with the following structure:
{
  "name": "Funnel Name",
  "description": "Brief description",
  "steps": ["Step 1 name", "Step 2 name", "Step 3 name"]
}`

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are a marketing funnel expert. Generate creative and effective funnel ideas.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.8,
        max_tokens: 500,
      }),
    })

    if (!response.ok) {
      const error = await response.json()
      return NextResponse.json({ error: error.error?.message || 'OpenAI API error' }, { status: 500 })
    }

    const data = await response.json()
    const content = data.choices[0].message.content

    // Try to parse as JSON
    try {
      const funnelIdea = JSON.parse(content)
      return NextResponse.json({ idea: funnelIdea })
    } catch {
      // If not valid JSON, return raw content
      return NextResponse.json({ idea: { raw: content } })
    }
  } catch (error: any) {
    console.error('AI idea generation error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
