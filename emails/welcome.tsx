import * as React from 'react'

interface WelcomeEmailProps {
  email: string
}

export const WelcomeEmail: React.FC<WelcomeEmailProps> = ({ email }) => (
  <div style={{ fontFamily: 'Arial, sans-serif', maxWidth: '600px', margin: '0 auto', padding: '20px' }}>
    <h1 style={{ color: '#000', fontSize: '32px', marginBottom: '20px' }}>
      Welcome to Funnel Maker! 🎉
    </h1>
    
    <p style={{ fontSize: '16px', lineHeight: '1.6', color: '#333' }}>
      Hi there! Thanks for signing up with <strong>{email}</strong>.
    </p>
    
    <p style={{ fontSize: '16px', lineHeight: '1.6', color: '#333' }}>
      You're now ready to start building high-converting sales funnels with our drag-and-drop builder.
    </p>
    
    <div style={{ background: '#f5f5f5', padding: '20px', borderRadius: '8px', margin: '30px 0' }}>
      <h2 style={{ fontSize: '20px', marginTop: '0' }}>🚀 Quick Start Guide:</h2>
      <ul style={{ paddingLeft: '20px' }}>
        <li style={{ marginBottom: '10px' }}>Browse our template library to get started fast</li>
        <li style={{ marginBottom: '10px' }}>Use the drag-and-drop builder to customize your funnel</li>
        <li style={{ marginBottom: '10px' }}>Track analytics to optimize your conversions</li>
        <li style={{ marginBottom: '10px' }}>Invite team members to collaborate</li>
      </ul>
    </div>
    
    <a 
      href="https://funnelmaker.app/dashboard" 
      style={{
        display: 'inline-block',
        background: '#000',
        color: '#fff',
        padding: '14px 28px',
        textDecoration: 'none',
        borderRadius: '6px',
        fontSize: '16px',
        fontWeight: 'bold',
        margin: '20px 0'
      }}
    >
      Go to Dashboard
    </a>
    
    <p style={{ fontSize: '14px', color: '#666', marginTop: '40px' }}>
      Need help? Reply to this email or visit our help center.
    </p>
    
    <hr style={{ border: 'none', borderTop: '1px solid #e5e5e5', margin: '40px 0' }} />
    
    <p style={{ fontSize: '12px', color: '#999' }}>
      You received this email because you signed up for Funnel Maker.
      <br />
      Funnel Maker · Made with ❤️
    </p>
  </div>
)
