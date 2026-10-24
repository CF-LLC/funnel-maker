import { Resend } from 'resend'
import { WelcomeEmail } from '@/emails/welcome'
import { FunnelExportEmail } from '@/emails/funnel-export'

let _resend: Resend | null = null

/** Lazily create the Resend client; v1 sends no email, so a missing key must not break the build. */
function getResend(): Resend {
  if (_resend) return _resend
  const key = process.env.RESEND_API_KEY
  if (!key) throw new Error('RESEND_API_KEY is not set')
  _resend = new Resend(key)
  return _resend
}

export async function sendWelcomeEmail(email: string) {
  try {
    const { data, error } = await getResend().emails.send({
      from: 'SaaS Nation <onboarding@funnelmaker.app>',
      to: [email],
      subject: 'Welcome to SaaS Nation! 🎉',
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
    const { data, error } = await getResend().emails.send({
      from: 'SaaS Nation <exports@funnelmaker.app>',
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
    const { data, error } = await getResend().emails.send({
      from: 'SaaS Nation <team@funnelmaker.app>',
      to: [email],
      subject: `You've been invited to join ${orgName} on SaaS Nation`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1>You've been invited!</h1>
          <p>${inviterName} has invited you to join <strong>${orgName}</strong> on SaaS Nation.</p>
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
