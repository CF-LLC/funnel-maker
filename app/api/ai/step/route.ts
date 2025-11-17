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
    const { stepType, currentContent, instructions, targetAudience } = await request.json()

    const prompt = `You are writing copy for a ${stepType} in a sales funnel.

${targetAudience ? `Target Audience: ${targetAudience}` : ''}
${currentContent ? `Current Content: ${currentContent}` : ''}

Instructions: ${instructions}

Generate compelling, conversion-focused copy for this funnel step. Include:
- A catchy headline
- Engaging body text (2-3 paragraphs)
- A strong call-to-action

Format your response as JSON:
{
  "headline": "Your headline here",
  "body": "Your body copy here",
  "cta": "Your call-to-action text"
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
            content: 'You are an expert copywriter specializing in sales funnels and conversion optimization.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.7,
        max_tokens: 800,
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
      const generatedContent = JSON.parse(content)
      return NextResponse.json({ content: generatedContent })
    } catch {
      // If not valid JSON, return raw content
      return NextResponse.json({ content: { raw: content } })
    }
  } catch (error: any) {
    console.error('AI step generation error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
