import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import JSZip from 'jszip'

export async function GET(
  request: Request,
  context: { params: Promise<{ funnelId: string }> }
) {
  const { funnelId } = await context.params
  const supabase = await createServerClient()

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Get funnel
    const { data: funnel, error } = await (supabase
      .from('funnels') as any)
      .select('*')
      .eq('id', funnelId)
      .eq('user_id', user.id)
      .single()

    if (error || !funnel) {
      return NextResponse.json({ error: 'Funnel not found' }, { status: 404 })
    }

    const steps = funnel.steps || []
    const zip = new JSZip()

    // Create HTML for each step
    steps.forEach((step: any, index: number) => {
      const html = generateStepHTML(step, index + 1, funnel.name)
      zip.file(`step-${index + 1}-${step.title.toLowerCase().replace(/\s+/g, '-')}.html`, html)
    })

    // Create index.html
    const indexHtml = generateIndexHTML(funnel.name, steps)
    zip.file('index.html', indexHtml)

    // Create README
    const readme = `# ${funnel.name}

This is an exported funnel from Funnel Maker.

## Files:
- index.html - Overview of all funnel steps
${steps.map((s: any, i: number) => `- step-${i + 1}-${s.title.toLowerCase().replace(/\s+/g, '-')}.html - ${s.title}`).join('\n')}

## Usage:
Upload these files to any web hosting provider to publish your funnel.
`
    zip.file('README.md', readme)

    // Generate zip file
    const zipBlob = await zip.generateAsync({ type: 'blob' })
    const buffer = await zipBlob.arrayBuffer()

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${funnel.name.toLowerCase().replace(/\s+/g, '-')}-funnel.zip"`,
      },
    })
  } catch (error: any) {
    console.error('Export error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

function generateStepHTML(step: any, stepNumber: number, funnelName: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${step.title} - ${funnelName}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      background: linear-gradient(to bottom, #ffffff, #f5f5f5);
      min-height: 100vh;
      padding: 40px 20px;
    }
    .container {
      max-width: 800px;
      margin: 0 auto;
      background: white;
      padding: 60px;
      border-radius: 12px;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    }
    .step-badge {
      display: inline-block;
      background: #000;
      color: #fff;
      padding: 8px 16px;
      border-radius: 20px;
      font-size: 14px;
      font-weight: 600;
      margin-bottom: 20px;
    }
    h1 {
      font-size: 42px;
      font-weight: 700;
      margin-bottom: 16px;
      color: #000;
    }
    .type {
      text-transform: capitalize;
      color: #666;
      font-size: 16px;
      margin-bottom: 32px;
    }
    .content {
      font-size: 18px;
      line-height: 1.8;
      white-space: pre-wrap;
      margin-bottom: 40px;
    }
    .cta {
      display: inline-block;
      background: #000;
      color: #fff;
      padding: 16px 32px;
      text-decoration: none;
      border-radius: 8px;
      font-weight: 600;
      font-size: 16px;
      transition: background 0.2s;
    }
    .cta:hover {
      background: #333;
    }
    footer {
      margin-top: 60px;
      padding-top: 30px;
      border-top: 1px solid #e5e5e5;
      text-align: center;
      color: #999;
      font-size: 14px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="step-badge">Step ${stepNumber}</div>
    <h1>${step.title}</h1>
    <div class="type">${step.type}</div>
    <div class="content">${step.content}</div>
    <a href="#" class="cta">Take Action</a>
    <footer>
      <p>Powered by Funnel Maker</p>
    </footer>
  </div>
</body>
</html>`
}

function generateIndexHTML(funnelName: string, steps: any[]): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${funnelName}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      background: linear-gradient(to bottom, #000, #1a1a1a);
      min-height: 100vh;
      padding: 60px 20px;
    }
    .container {
      max-width: 1200px;
      margin: 0 auto;
    }
    h1 {
      font-size: 56px;
      font-weight: 700;
      color: #fff;
      text-align: center;
      margin-bottom: 60px;
    }
    .steps {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 24px;
    }
    .step-card {
      background: white;
      padding: 32px;
      border-radius: 12px;
      text-decoration: none;
      color: inherit;
      transition: transform 0.2s, box-shadow 0.2s;
    }
    .step-card:hover {
      transform: translateY(-4px);
      box-shadow: 0 12px 24px rgba(0, 0, 0, 0.2);
    }
    .step-number {
      display: inline-block;
      background: #000;
      color: #fff;
      width: 40px;
      height: 40px;
      border-radius: 50%;
      text-align: center;
      line-height: 40px;
      font-weight: 700;
      margin-bottom: 16px;
    }
    .step-card h2 {
      font-size: 24px;
      margin-bottom: 8px;
    }
    .step-card p {
      color: #666;
      font-size: 14px;
      text-transform: capitalize;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>${funnelName}</h1>
    <div class="steps">
      ${steps
        .map(
          (step: any, index: number) => `
        <a href="step-${index + 1}-${step.title.toLowerCase().replace(/\s+/g, '-')}.html" class="step-card">
          <div class="step-number">${index + 1}</div>
          <h2>${step.title}</h2>
          <p>${step.type}</p>
        </a>
      `
        )
        .join('')}
    </div>
  </div>
</body>
</html>`
}
