export type AffiliateLink = {
  id: string
  url: string
  buttonText: string
  icon?: string // emoji or icon name
}

export type FunnelStep = {
  id: string
  type: 'landing' | 'lead-capture' | 'sales' | 'thank-you' | 'affiliate-link'
  title: string
  content: string
  order: number
  // Affiliate link specific fields
  affiliateUrl?: string // legacy support
  buttonText?: string // legacy support
  backgroundColor?: string
  backgroundImage?: string
  textColor?: string
  affiliateLinks?: AffiliateLink[] // new multi-link support
  // Additional customization options
  headline?: string
  subheadline?: string
  ctaText?: string
  ctaUrl?: string
  formFields?: string[] // for lead capture
  showSocialProof?: boolean
  testimonials?: string[]
  features?: string[]
  pricing?: {
    amount: string
    currency: string
    interval?: string
  }
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
        title: 'Download Your Free [Resource Name]',
        headline: 'Get Your Free [Resource] Today',
        subheadline: 'Join thousands of successful [audience] who are already using this resource',
        content: 'Unlock the secrets to [benefit]. This comprehensive guide will teach you:\n\n• [Key benefit 1]\n• [Key benefit 2]\n• [Key benefit 3]\n\nNo credit card required. Instant access.',
        ctaText: 'Get Instant Access',
        features: [
          '[Number] pages of actionable insights',
          'Step-by-step implementation guide',
          'Templates and worksheets included',
          'Lifetime access to updates'
        ],
        showSocialProof: true,
        testimonials: [
          'This resource changed everything for my business! - John D.',
          'Clear, actionable, and results-driven. Highly recommend! - Sarah M.'
        ],
        order: 0,
      },
      {
        id: '2',
        type: 'lead-capture',
        title: 'Enter Your Details',
        headline: 'Get Instant Access',
        content: 'Enter your information below and we\'ll send your free resource immediately',
        formFields: ['name', 'email'],
        ctaText: 'Send Me The Free Guide',
        order: 1,
      },
      {
        id: '3',
        type: 'thank-you',
        title: 'Check Your Email!',
        headline: 'Success! Your Free Resource is On Its Way',
        content: 'We\'ve sent your free [resource] to your email address. Check your inbox (and spam folder) in the next few minutes.\n\nWhile you wait, here are some next steps:\n\n1. Whitelist our email address\n2. Follow us on social media for more tips\n3. Check out our other resources',
        ctaText: 'Browse More Resources',
        ctaUrl: '/templates',
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
        title: 'Discover [Product Name]',
        headline: 'Transform Your [Result] in Just [Timeframe]',
        subheadline: 'The proven system used by [number]+ successful customers',
        content: 'Stop struggling with [pain point]. Our [product] helps you:\n\n✓ [Benefit 1]\n✓ [Benefit 2]\n✓ [Benefit 3]\n\nBacked by our 30-day money-back guarantee.',
        ctaText: 'Get Started Today',
        features: [
          'Complete [product] system',
          'Step-by-step video training',
          'Private community access',
          'Lifetime updates included',
          'Priority email support'
        ],
        showSocialProof: true,
        testimonials: [
          'ROI in the first month! Exactly what I needed. - Mike R.',
          'Simple to use, incredibly powerful. Game changer! - Lisa K.',
          'Best investment I\'ve made for my business. - Tom S.'
        ],
        order: 0,
      },
      {
        id: '2',
        type: 'sales',
        title: 'Special Launch Pricing',
        headline: 'Get [Product] For Just $99',
        content: '🎉 LIMITED TIME OFFER 🎉\n\nNormally $299, now only $99\n\nHere\'s everything you get:\n\n• Core [Product] Training ($199 value)\n• Bonus Templates Pack ($49 value)\n• Private Community Access ($99/year value)\n• 1-on-1 Onboarding Call ($150 value)\n\nTotal Value: $497\nYour Price Today: $99\n\n30-Day Money-Back Guarantee',
        pricing: {
          amount: '$99',
          currency: 'USD',
          interval: 'one-time'
        },
        ctaText: 'Claim Your Discount Now',
        features: [
          '30-day money-back guarantee',
          'Instant access after purchase',
          'All future updates free',
          'Premium support included'
        ],
        order: 1,
      },
      {
        id: '3',
        type: 'thank-you',
        title: 'Welcome Aboard!',
        headline: 'Your Purchase is Complete',
        content: '🎊 Congratulations on taking action!\n\nYou now have instant access to [Product]. Here are your next steps:\n\n1. Check your email for login details\n2. Join our private community\n3. Watch the welcome video\n4. Schedule your onboarding call\n\nWe can\'t wait to see your results!',
        ctaText: 'Access Your Account',
        ctaUrl: '/dashboard',
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
        title: 'Join Our Free Live Webinar',
        headline: 'FREE Masterclass: [Topic]',
        subheadline: 'Live training on [Date] at [Time] [Timezone]',
        content: 'In this exclusive live training, you\'ll discover:\n\n📌 [Learning point 1]\n📌 [Learning point 2]\n📌 [Learning point 3]\n📌 Plus a special announcement at the end\n\nSpots are limited - register now to secure your seat!',
        ctaText: 'Save My Spot (Free)',
        features: [
          'Live Q&A session',
          'Downloadable workbook',
          'Exclusive attendee bonuses',
          'Replay available for 48 hours'
        ],
        showSocialProof: true,
        testimonials: [
          'The best webinar I\'ve attended this year! - Jennifer L.',
          'Packed with value. Can\'t wait for the next one. - David M.'
        ],
        order: 0,
      },
      {
        id: '2',
        type: 'lead-capture',
        title: 'Reserve Your Spot',
        headline: 'Enter Your Details to Register',
        content: 'Limited spots available. Register now to secure your seat for this live training.\n\nYou\'ll receive:\n• Calendar invite with webinar link\n• Pre-webinar resources\n• Reminder emails',
        formFields: ['name', 'email'],
        ctaText: 'Register For Free',
        order: 1,
      },
      {
        id: '3',
        type: 'thank-you',
        title: 'You\'re Registered!',
        headline: 'See You on [Date] at [Time]!',
        content: '✅ Your spot is confirmed!\n\nWe\'ve sent a calendar invite to your email. Here\'s what to do next:\n\n1. Add the event to your calendar\n2. Mark the email as important\n3. Join our community for bonus content\n4. Prepare your questions for the Q&A\n\nWe\'ll send you a reminder 1 hour before the webinar starts.',
        ctaText: 'Add to Calendar',
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
        title: 'My Favorite Tools & Resources',
        headline: 'Top Recommendations',
        content: 'Here are the tools and resources I personally use and recommend. Each one has been carefully selected based on quality, value, and results.\n\n💡 These are affiliate links - I may earn a commission at no extra cost to you.',
        backgroundColor: '#6366f1',
        backgroundImage: '',
        textColor: '#ffffff',
        affiliateLinks: [
          {
            id: '1',
            url: 'https://example.com/affiliate/tool1',
            buttonText: 'My #1 Email Marketing Tool',
            icon: '📧',
          },
          {
            id: '2',
            url: 'https://example.com/affiliate/course',
            buttonText: 'Best Online Course Platform',
            icon: '📚',
          },
          {
            id: '3',
            url: 'https://example.com/affiliate/hosting',
            buttonText: 'Website Hosting I Trust',
            icon: '🚀',
          },
          {
            id: '4',
            url: 'https://example.com/affiliate/design',
            buttonText: 'Design Tool for Non-Designers',
            icon: '🎨',
          },
          {
            id: '5',
            url: 'https://example.com/affiliate/analytics',
            buttonText: 'Analytics & Tracking Solution',
            icon: '📊',
          },
        ],
        order: 0,
      },
    ],
  },
]
