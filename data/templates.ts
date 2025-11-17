export type FunnelStep = {
  id: string
  type: 'landing' | 'lead-capture' | 'sales' | 'thank-you' | 'affiliate-link'
  title: string
  content: string
  order: number
  // Affiliate link specific fields
  affiliateUrl?: string
  buttonText?: string
  backgroundColor?: string
  backgroundImage?: string
  textColor?: string
}

export type FunnelTemplate = {
  id: string
  name: string
  description: string
  steps: FunnelStep[]
}

export const templates: FunnelTemplate[] = [
  {
    id: 'lead-magnet',
    name: 'Lead Magnet Funnel',
    description: 'Perfect for growing your email list with a free resource',
    steps: [
      {
        id: '1',
        type: 'landing',
        title: 'Landing Page',
        content: 'Download Your Free [Resource Name]',
        order: 0,
      },
      {
        id: '2',
        type: 'lead-capture',
        title: 'Lead Capture',
        content: 'Enter your email to get instant access',
        order: 1,
      },
      {
        id: '3',
        type: 'thank-you',
        title: 'Thank You',
        content: 'Check your email for your free resource!',
        order: 2,
      },
    ],
  },
  {
    id: 'product-sales',
    name: 'Product Sales Funnel',
    description: 'Convert visitors into paying customers',
    steps: [
      {
        id: '1',
        type: 'landing',
        title: 'Landing Page',
        content: 'Discover [Product Name]',
        order: 0,
      },
      {
        id: '2',
        type: 'sales',
        title: 'Sales Page',
        content: 'Get [Product] for only $99',
        order: 1,
      },
      {
        id: '3',
        type: 'thank-you',
        title: 'Thank You',
        content: 'Thank you for your purchase!',
        order: 2,
      },
    ],
  },
  {
    id: 'webinar',
    name: 'Webinar Funnel',
    description: 'Drive registrations for your webinar or event',
    steps: [
      {
        id: '1',
        type: 'landing',
        title: 'Landing Page',
        content: 'Join Our Free Webinar',
        order: 0,
      },
      {
        id: '2',
        type: 'lead-capture',
        title: 'Registration',
        content: 'Register now to save your spot',
        order: 1,
      },
      {
        id: '3',
        type: 'thank-you',
        title: 'Confirmation',
        content: "You're registered! Check your email for details.",
        order: 2,
      },
    ],
  },
  {
    id: 'affiliate-links',
    name: 'Affiliate Link Funnel',
    description: 'Beautiful landing page with affiliate links and styled backgrounds',
    steps: [
      {
        id: '1',
        type: 'affiliate-link',
        title: 'Affiliate Hub',
        content: 'Check out my favorite products',
        affiliateUrl: 'https://example.com/affiliate',
        buttonText: 'Get Started Now',
        backgroundColor: '#6366f1',
        backgroundImage: '',
        textColor: '#ffffff',
        order: 0,
      },
    ],
  },
]
