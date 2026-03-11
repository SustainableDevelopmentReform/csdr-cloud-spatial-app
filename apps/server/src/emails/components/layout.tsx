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
} from '@react-email/components'
import React from 'react'

const palette = {
  background: '#fafafa',
  card: '#ffffff',
  foreground: '#09090b',
  muted: '#71717a',
  border: '#e4e4e7',
  primary: '#18181b',
  primaryForeground: '#fafaf9',
}

const sansStack =
  '-apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif'

interface AuthEmailLayoutProps {
  preview: string
  heading: string
  lead: string
  actionLabel?: string
  actionUrl?: string
  code?: string
  helperText?: string
}

export function AuthEmailLayout(props: AuthEmailLayoutProps) {
  return (
    <Html>
      <Head />
      <Preview>{props.preview}</Preview>
      <Body
        style={{
          backgroundColor: palette.background,
          fontFamily: sansStack,
          margin: '0',
          padding: '40px 16px',
          color: palette.foreground,
        }}
      >
        <Container
          style={{
            maxWidth: '520px',
            margin: '0 auto',
            backgroundColor: palette.card,
            border: `1px solid ${palette.border}`,
            borderRadius: '8px',
          }}
        >
          <Section style={{ padding: '32px 32px 0' }}>
            <Text
              style={{
                margin: '0 0 4px',
                fontSize: '13px',
                fontWeight: '500',
                color: palette.muted,
              }}
            >
              CSDR Cloud Spatial
            </Text>
            <Heading
              style={{
                margin: '0',
                fontSize: '24px',
                lineHeight: '1.3',
                fontWeight: '600',
                color: palette.foreground,
              }}
            >
              {props.heading}
            </Heading>
          </Section>

          <Section style={{ padding: '24px 32px 32px' }}>
            <Text
              style={{
                margin: '0 0 20px',
                fontSize: '14px',
                lineHeight: '24px',
                color: palette.foreground,
              }}
            >
              {props.lead}
            </Text>

            {props.code ? (
              <Section
                style={{
                  margin: '0 0 20px',
                  padding: '16px 20px',
                  backgroundColor: palette.background,
                  border: `1px solid ${palette.border}`,
                  borderRadius: '6px',
                  textAlign: 'center' as const,
                }}
              >
                <Text
                  style={{
                    margin: '0 0 4px',
                    fontSize: '12px',
                    fontWeight: '500',
                    color: palette.muted,
                  }}
                >
                  Your verification code
                </Text>
                <Text
                  style={{
                    margin: '0',
                    fontSize: '32px',
                    fontWeight: '700',
                    letterSpacing: '0.2em',
                    fontFamily:
                      'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                    color: palette.foreground,
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
                  margin: '4px 0 20px',
                  padding: '10px 16px',
                  backgroundColor: palette.primary,
                  color: palette.primaryForeground,
                  borderRadius: '6px',
                  textDecoration: 'none',
                  fontSize: '14px',
                  fontWeight: '500',
                }}
              >
                {props.actionLabel}
              </Button>
            ) : null}

            {props.helperText ? (
              <Text
                style={{
                  margin: '0 0 8px',
                  fontSize: '13px',
                  lineHeight: '20px',
                  color: palette.muted,
                }}
              >
                {props.helperText}
              </Text>
            ) : null}

            <Hr
              style={{
                borderColor: palette.border,
                margin: '24px 0 16px',
              }}
            />

            <Text
              style={{
                margin: '0',
                fontSize: '12px',
                lineHeight: '20px',
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
