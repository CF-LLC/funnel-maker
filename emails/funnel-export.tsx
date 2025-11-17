import * as React from 'react'

interface FunnelExportEmailProps {
  funnelName: string
  downloadUrl: string
}

export const FunnelExportEmail: React.FC<FunnelExportEmailProps> = ({ 
  funnelName, 
  downloadUrl 
}) => (
  <div style={{ fontFamily: 'Arial, sans-serif', maxWidth: '600px', margin: '0 auto', padding: '20px' }}>
    <h1 style={{ color: '#000', fontSize: '28px', marginBottom: '20px' }}>
      Your funnel is ready! 📦
    </h1>
    
    <p style={{ fontSize: '16px', lineHeight: '1.6', color: '#333' }}>
      Your export of <strong>{funnelName}</strong> has been generated and is ready to download.
    </p>
    
    <div style={{ background: '#f0f9ff', padding: '20px', borderRadius: '8px', margin: '30px 0' }}>
      <p style={{ margin: '0 0 15px 0', fontSize: '14px', color: '#666' }}>
        <strong>What's included:</strong>
      </p>
      <ul style={{ paddingLeft: '20px', margin: '0' }}>
        <li style={{ marginBottom: '8px' }}>Complete HTML files for all funnel steps</li>
        <li style={{ marginBottom: '8px' }}>Inline CSS styling</li>
        <li style={{ marginBottom: '8px' }}>Ready to upload to any hosting provider</li>
      </ul>
    </div>
    
    <a 
      href={downloadUrl} 
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
      Download Funnel
    </a>
    
    <p style={{ fontSize: '14px', color: '#666', marginTop: '30px' }}>
      <strong>Note:</strong> This download link will expire in 7 days.
    </p>
    
    <hr style={{ border: 'none', borderTop: '1px solid #e5e5e5', margin: '40px 0' }} />
    
    <p style={{ fontSize: '12px', color: '#999' }}>
      Funnel Maker · Made with ❤️
    </p>
  </div>
)
