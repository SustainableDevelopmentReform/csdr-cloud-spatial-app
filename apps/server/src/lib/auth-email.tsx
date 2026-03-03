import { render } from '@react-email/components'
import nodemailer, { type Transporter } from 'nodemailer'
import type { ReactElement } from 'react'
import { OTPEmail } from '~/emails/otp-email'
import { PasswordResetEmail } from '~/emails/password-reset-email'
import { VerificationEmail } from '~/emails/verification-email'
import { env } from '~/env'
import { logAuthSecurity } from './auth-security'

export type AuthEmailKind = 'verification' | 'password-reset' | 'two-factor-otp'

interface AuthEmailUser {
  id: string
  email: string
  name?: string | null
}

interface AuthEmailMessage {
  kind: AuthEmailKind
  to: string
  subject: string
  react: ReactElement
  actionUrl?: string
  code?: string
  rawToken?: string
}

let smtpTransporter: Transporter | null = null

async function getSmtpTransporter() {
  if (smtpTransporter) {
    return smtpTransporter
  }

  if (!env.EMAIL_SENDER) {
    throw new Error('EMAIL_SENDER is required when AUTH_EMAIL_MODE=smtp')
  }

  if (!env.SMTP_HOST || !env.SMTP_PORT) {
    throw new Error(
      'SMTP_HOST and SMTP_PORT are required when AUTH_EMAIL_MODE=smtp',
    )
  }

  if (
    (env.SMTP_USERNAME && !env.SMTP_PASSWORD) ||
    (!env.SMTP_USERNAME && env.SMTP_PASSWORD)
  ) {
    throw new Error(
      'SMTP_USERNAME and SMTP_PASSWORD must both be set when using SMTP auth',
    )
  }

  smtpTransporter = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_PORT === 465,
    auth:
      env.SMTP_USERNAME && env.SMTP_PASSWORD
        ? {
            user: env.SMTP_USERNAME,
            pass: env.SMTP_PASSWORD,
          }
        : undefined,
  })

  return smtpTransporter
}

async function renderEmail(message: AuthEmailMessage) {
  return {
    html: await render(message.react),
    text: await render(message.react, { plainText: true }),
  }
}

async function deliverAuthEmail(message: AuthEmailMessage) {
  console.info(`[auth_email] AUTH_EMAIL_MODE: ${env.AUTH_EMAIL_MODE}`)
  if (env.AUTH_EMAIL_MODE === 'log') {
    const safeDetails =
      env.NODE_ENV === 'production'
        ? {
            kind: message.kind,
            to: message.to,
            subject: message.subject,
          }
        : {
            kind: message.kind,
            to: message.to,
            subject: message.subject,
            actionUrl: message.actionUrl ?? null,
            code: message.code ?? null,
            rawToken: message.rawToken ?? null,
          }

    console.info(`[auth_email] ${JSON.stringify(safeDetails)}`)
    return
  }

  const { html, text } = await renderEmail(message)
  const transporter = await getSmtpTransporter()

  console.info(`[auth_email] Sending email to ${message.to}`)

  await transporter.sendMail({
    from: env.EMAIL_SENDER,
    to: message.to,
    subject: message.subject,
    html,
    text,
  })
}

export async function sendVerificationEmail(data: {
  user: AuthEmailUser
  url: string
  token: string
}) {
  await deliverAuthEmail({
    kind: 'verification',
    to: data.user.email,
    subject: 'Verify your email address',
    react: (
      <VerificationEmail userName={data.user.name} verificationUrl={data.url} />
    ),
    actionUrl: data.url,
    rawToken: data.token,
  })

  logAuthSecurity('verification_email_sent', {
    userId: data.user.id,
    email: data.user.email,
    deliveryMode: env.AUTH_EMAIL_MODE,
  })
}

export async function sendResetPasswordEmail(data: {
  user: AuthEmailUser
  url: string
  token: string
}) {
  await deliverAuthEmail({
    kind: 'password-reset',
    to: data.user.email,
    subject: 'Reset your password',
    react: <PasswordResetEmail userName={data.user.name} resetUrl={data.url} />,
    actionUrl: data.url,
    rawToken: data.token,
  })

  logAuthSecurity('password_reset_requested', {
    userId: data.user.id,
    email: data.user.email,
    deliveryMode: env.AUTH_EMAIL_MODE,
  })
}

export async function sendTwoFactorOTPEmail(data: {
  user: AuthEmailUser
  otp: string
}) {
  await deliverAuthEmail({
    kind: 'two-factor-otp',
    to: data.user.email,
    subject: 'Your verification code',
    react: <OTPEmail userName={data.user.name} otp={data.otp} />,
    code: data.otp,
  })

  logAuthSecurity('two_factor_email_otp_sent', {
    userId: data.user.id,
    email: data.user.email,
    deliveryMode: env.AUTH_EMAIL_MODE,
  })
}
