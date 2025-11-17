import { Resend } from 'resend'
import { WelcomeEmail } from '@/emails/welcome'
import { FunnelExportEmail } from '@/emails/funnel-export'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function sendWelcomeEmail(email: string) {
  try {
    const { data, error } = await resend.emails.send({
      from: 'Funnel Maker <onboarding@funnelmaker.app>',
      to: [email],
      subject: 'Welcome to Funnel Maker! 🎉',
      react: WelcomeEmail({ email }),
    })

    if (error) {
      console.error('Error sending welcome email:', error)
      return { success: false, error }
    }

    return { success: true, data }
  } catch (error) {
    console.error('Failed to send welcome email:', error)
    return { success: false, error }
  }
}

export async function sendFunnelExportEmail(
  email: string,
  funnelName: string,
  downloadUrl: string
) {
  try {
    const { data, error } = await resend.emails.send({
      from: 'Funnel Maker <exports@funnelmaker.app>',
      to: [email],
      subject: `Your funnel "${funnelName}" is ready to download`,
      react: FunnelExportEmail({ funnelName, downloadUrl }),
    })

    if (error) {
      console.error('Error sending export email:', error)
      return { success: false, error }
    }

    return { success: true, data }
  } catch (error) {
    console.error('Failed to send export email:', error)
    return { success: false, error }
  }
}

export async function sendTeamInviteEmail(
  email: string,
  orgName: string,
  inviteLink: string,
  inviterName: string
) {
  try {
    const { data, error } = await resend.emails.send({
      from: 'Funnel Maker <team@funnelmaker.app>',
      to: [email],
      subject: `You've been invited to join ${orgName} on Funnel Maker`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1>You've been invited!</h1>
          <p>${inviterName} has invited you to join <strong>${orgName}</strong> on Funnel Maker.</p>
          <p>Click the link below to accept the invitation:</p>
          <a href="${inviteLink}" style="display: inline-block; background: #000; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0;">
            Accept Invitation
          </a>
          <p>This invitation will expire in 7 days.</p>
          <p style="color: #666; font-size: 14px;">If you didn't expect this invitation, you can safely ignore this email.</p>
        </div>
      `,
    })

    if (error) {
      console.error('Error sending invite email:', error)
      return { success: false, error }
    }

    return { success: true, data }
  } catch (error) {
    console.error('Failed to send invite email:', error)
    return { success: false, error }
  }
}
