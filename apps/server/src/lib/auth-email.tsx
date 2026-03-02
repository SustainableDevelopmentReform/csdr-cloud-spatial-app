import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text,
  render,
} from '@react-email/components'
import nodemailer, { type Transporter } from 'nodemailer'
import React from 'react'
import { env } from '~/env'
import { logAuthSecurity } from './auth-security'

export type AuthEmailMode = 'log' | 'smtp'
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
  preview: string
  heading: string
  lead: string
  actionLabel?: string
  actionUrl?: string
  code?: string
  helperText?: string
  rawToken?: string
}

const authEmailMode: AuthEmailMode = env.AUTH_EMAIL_MODE
let smtpTransporter: Transporter | null = null

const palette = {
  paper: '#f4efe6',
  ink: '#1b1c19',
  muted: '#65645d',
  border: '#d8cfbe',
  accent: '#9d3c17',
  accentSoft: '#efe0d3',
  code: '#fcf6ee',
}

const fontStack = '"Iowan Old Style", "Palatino Linotype", Palatino, serif'
const sansStack = '"Avenir Next", "Segoe UI", sans-serif'

function AuthEmailFrame(props: AuthEmailMessage) {
  return (
    <Html>
      <Head />
      <Preview>{props.preview}</Preview>
      <Body
        style={{
          backgroundColor: '#e9dfcf',
          fontFamily: sansStack,
          margin: '0',
          padding: '32px 0',
          color: palette.ink,
        }}
      >
        <Container
          style={{
            maxWidth: '620px',
            margin: '0 auto',
            backgroundColor: palette.paper,
            border: `1px solid ${palette.border}`,
            borderRadius: '28px',
            overflow: 'hidden',
            boxShadow: '0 24px 70px rgba(41, 29, 16, 0.10)',
          }}
        >
          <Section
            style={{
              padding: '28px 32px 18px',
              background:
                'linear-gradient(135deg, rgba(157,60,23,0.10), rgba(244,239,230,0.4))',
              borderBottom: `1px solid ${palette.border}`,
            }}
          >
            <Text
              style={{
                margin: '0 0 10px',
                textTransform: 'uppercase',
                letterSpacing: '0.2em',
                fontSize: '11px',
                color: palette.muted,
              }}
            >
              CSDR Cloud Spatial
            </Text>
            <Heading
              style={{
                margin: '0',
                fontFamily: fontStack,
                fontSize: '34px',
                lineHeight: '1.1',
                fontWeight: '700',
                color: palette.ink,
              }}
            >
              {props.heading}
            </Heading>
          </Section>

          <Section style={{ padding: '28px 32px 32px' }}>
            <Text
              style={{
                margin: '0 0 18px',
                fontSize: '16px',
                lineHeight: '26px',
                color: palette.ink,
              }}
            >
              {props.lead}
            </Text>

            {props.code ? (
              <Section
                style={{
                  margin: '0 0 18px',
                  padding: '18px 20px',
                  backgroundColor: palette.code,
                  border: `1px solid ${palette.border}`,
                  borderRadius: '18px',
                }}
              >
                <Text
                  style={{
                    margin: '0 0 8px',
                    fontSize: '12px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.18em',
                    color: palette.muted,
                  }}
                >
                  One-time code
                </Text>
                <Text
                  style={{
                    margin: '0',
                    fontSize: '34px',
                    fontWeight: '700',
                    letterSpacing: '0.32em',
                    color: palette.ink,
                  }}
                >
                  {props.code}
                </Text>
              </Section>
            ) : null}

            {props.actionUrl && props.actionLabel ? (
              <Button
                href={props.actionUrl}
                style={{
                  display: 'inline-block',
                  margin: '8px 0 16px',
                  padding: '14px 24px',
                  backgroundColor: palette.accent,
                  color: '#fff7f2',
                  borderRadius: '999px',
                  textDecoration: 'none',
                  fontSize: '14px',
                  fontWeight: '700',
                }}
              >
                {props.actionLabel}
              </Button>
            ) : null}

            {props.helperText ? (
              <Text
                style={{
                  margin: '0',
                  fontSize: '14px',
                  lineHeight: '22px',
                  color: palette.muted,
                }}
              >
                {props.helperText}
              </Text>
            ) : null}

            <Hr
              style={{
                borderColor: palette.border,
                margin: '26px 0 18px',
              }}
            />

            <Text
              style={{
                margin: '0',
                fontSize: '13px',
                lineHeight: '22px',
                color: palette.muted,
              }}
            >
              If you did not expect this message, you can ignore it and no
              changes will be made to your account.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}

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
  const element = <AuthEmailFrame {...message} />

  return {
    html: await render(element),
    text: await render(element, { plainText: true }),
  }
}

async function deliverAuthEmail(message: AuthEmailMessage) {
  if (authEmailMode === 'log') {
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
    preview: 'Confirm your email address to finish setting up your account.',
    heading: 'Confirm your email address',
    lead: 'Use the secure link below to confirm your email address and finish setting up your access to CSDR Cloud Spatial.',
    actionLabel: 'Verify email',
    actionUrl: data.url,
    helperText: 'This verification link expires in 24 hours.',
    rawToken: data.token,
  })

  logAuthSecurity('verification_email_sent', {
    userId: data.user.id,
    email: data.user.email,
    deliveryMode: authEmailMode,
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
    preview: 'Use this link to reset your CSDR Cloud Spatial password.',
    heading: 'Reset your password',
    lead: 'A password reset was requested for your account. If that was you, continue using the secure link below.',
    actionLabel: 'Reset password',
    actionUrl: data.url,
    helperText: 'This reset link expires in 1 hour.',
    rawToken: data.token,
  })

  logAuthSecurity('password_reset_requested', {
    userId: data.user.id,
    email: data.user.email,
    deliveryMode: authEmailMode,
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
    preview: 'Use this verification code to finish signing in.',
    heading: 'Use this verification code',
    lead: 'Enter this code in the sign-in screen to complete your two-factor verification.',
    code: data.otp,
    helperText:
      'The code expires in a few minutes. Only enter it into the official CSDR Cloud Spatial sign-in screen.',
  })

  logAuthSecurity('two_factor_email_otp_sent', {
    userId: data.user.id,
    email: data.user.email,
    deliveryMode: authEmailMode,
  })
}
