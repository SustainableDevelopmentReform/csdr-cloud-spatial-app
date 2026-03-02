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
  paper: '#f4efe6',
  ink: '#1b1c19',
  muted: '#65645d',
  border: '#d8cfbe',
  accent: '#9d3c17',
  code: '#fcf6ee',
}

const fontStack = '"Iowan Old Style", "Palatino Linotype", Palatino, serif'
const sansStack = '"Avenir Next", "Segoe UI", sans-serif'

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
