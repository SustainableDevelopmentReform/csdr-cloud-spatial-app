import { afterEach, describe, expect, it, vi } from 'vitest'

type MailOptions = {
  from?: string
  to?: string
  subject?: string
  html?: string
  text?: string
}

type EmailEnv = Record<string, string>
type RenderOptions = {
  plainText?: boolean
}
type RenderElement = {
  props?: unknown
}

const user = {
  id: 'user-1',
  email: 'user@example.com',
  name: 'Test User',
}

const stubEmailEnv = (values: EmailEnv) => {
  for (const [key, value] of Object.entries(values)) {
    vi.stubEnv(key, value)
  }
}

const loadEmailModule = async (envValues: EmailEnv) => {
  vi.resetModules()
  stubEmailEnv(envValues)

  const sendMail = vi.fn<(message: MailOptions) => Promise<void>>()
  sendMail.mockResolvedValue()
  const createTransport = vi.fn<() => { sendMail: typeof sendMail }>(() => ({
    sendMail,
  }))
  const logAuthSecurity =
    vi.fn<(event: string, details: Record<string, unknown>) => void>()
  const jsxDEV = (type: unknown, props: unknown) => ({
    type,
    props,
  })
  const render =
    vi.fn<
      (element: RenderElement, options?: RenderOptions) => Promise<string>
    >()
  render.mockImplementation(async (element, options) => {
    const prefix = options?.plainText ? 'text' : 'html'

    return `${prefix}:${JSON.stringify(element.props ?? {})}`
  })

  vi.doMock('nodemailer', () => ({
    default: {
      createTransport,
    },
    createTransport,
  }))
  vi.doMock('./security', () => ({
    logAuthSecurity,
  }))
  vi.doMock('react/jsx-dev-runtime', () => ({
    Fragment: Symbol.for('react.fragment'),
    jsxDEV,
  }))
  vi.doMock('@react-email/components', () => ({
    render,
  }))

  const emailModule = await import('./email')

  return {
    emailModule,
    sendMail,
    createTransport,
    logAuthSecurity,
    render,
  }
}

const findSentMessage = (messages: MailOptions[], subject: string) => {
  const message = messages.find((entry) => entry.subject === subject)
  if (!message) {
    throw new Error(`Expected email with subject ${subject}`)
  }

  return message
}

afterEach(() => {
  vi.restoreAllMocks()
  vi.resetModules()
  vi.doUnmock('nodemailer')
  vi.doUnmock('./security')
  vi.doUnmock('react/jsx-dev-runtime')
  vi.doUnmock('@react-email/components')
  vi.unstubAllEnvs()
})

describe('auth email delivery', () => {
  it('redacts token details in production log mode and records security audit details', async () => {
    const info = vi.spyOn(console, 'info').mockImplementation(() => {})
    const { emailModule, logAuthSecurity } = await loadEmailModule({
      NODE_ENV: 'production',
      AUTH_EMAIL_MODE: 'log',
    })

    await emailModule.sendVerificationEmail({
      user,
      url: 'https://app.example.com/verify?token=raw-token',
      token: 'raw-token',
    })

    const call = info.mock.calls.at(0)
    if (!call) {
      throw new Error('Expected console.info to be called')
    }
    const message = call[0]

    expect(message).toContain('"kind":"verification"')
    expect(message).toContain('"to":"user@example.com"')
    expect(message).not.toContain('raw-token')
    expect(message).not.toContain('https://app.example.com/verify')
    expect(logAuthSecurity).toHaveBeenCalledWith('verification_email_sent', {
      userId: 'user-1',
      email: 'user@example.com',
      deliveryMode: 'log',
    })
  })

  it('validates required SMTP configuration before sending', async () => {
    const { emailModule, sendMail } = await loadEmailModule({
      NODE_ENV: 'test',
      AUTH_EMAIL_MODE: 'smtp',
      EMAIL_SENDER: '',
      SMTP_HOST: 'smtp.example.com',
      SMTP_PORT: '1025',
    })

    await expect(
      emailModule.sendResetPasswordEmail({
        user,
        url: 'https://app.example.com/reset',
        token: 'reset-token',
      }),
    ).rejects.toThrow('EMAIL_SENDER is required when AUTH_EMAIL_MODE=smtp')
    expect(sendMail).not.toHaveBeenCalled()
  })

  it('renders and sends SMTP auth emails with expected subjects and security logs', async () => {
    const { emailModule, createTransport, sendMail, logAuthSecurity } =
      await loadEmailModule({
        NODE_ENV: 'test',
        AUTH_EMAIL_MODE: 'smtp',
        EMAIL_SENDER: 'sender@example.com',
        SMTP_HOST: 'smtp.example.com',
        SMTP_PORT: '465',
        SMTP_USERNAME: 'smtp-user',
        SMTP_PASSWORD: 'smtp-pass',
      })

    await emailModule.sendVerificationEmail({
      user,
      url: 'https://app.example.com/verify',
      token: 'verify-token',
    })
    await emailModule.sendResetPasswordEmail({
      user,
      url: 'https://app.example.com/reset',
      token: 'reset-token',
    })
    await emailModule.sendTwoFactorOTPEmail({
      user,
      otp: '123456',
    })
    await emailModule.sendOrganizationInvitationEmail({
      acceptUrl: 'https://app.example.com/invitations/invite-1',
      email: 'invitee@example.com',
      invitationId: 'invite-1',
      inviterEmail: 'admin@example.com',
      inviterName: 'Admin User',
      organizationName: 'Spatial Data Framework',
      role: 'org_admin',
    })

    expect(createTransport).toHaveBeenCalledTimes(1)
    expect(createTransport).toHaveBeenCalledWith({
      host: 'smtp.example.com',
      port: 465,
      secure: true,
      auth: {
        user: 'smtp-user',
        pass: 'smtp-pass',
      },
    })
    expect(sendMail).toHaveBeenCalledTimes(4)

    const sentMessages = sendMail.mock.calls.map(([message]) => message)
    const verification = findSentMessage(
      sentMessages,
      'Verify your email address',
    )
    const reset = findSentMessage(sentMessages, 'Reset your password')
    const otp = findSentMessage(sentMessages, 'Your verification code')
    const invitation = findSentMessage(
      sentMessages,
      "You're invited to join Spatial Data Framework",
    )

    expect(verification).toMatchObject({
      from: 'sender@example.com',
      to: 'user@example.com',
      subject: 'Verify your email address',
    })
    expect(verification.text).toContain('https://app.example.com/verify')
    expect(reset.text).toContain('https://app.example.com/reset')
    expect(otp.text).toContain('123456')
    expect(invitation.to).toBe('invitee@example.com')
    expect(invitation.text).toContain(
      'https://app.example.com/invitations/invite-1',
    )
    expect(logAuthSecurity).toHaveBeenCalledWith('verification_email_sent', {
      userId: 'user-1',
      email: 'user@example.com',
      deliveryMode: 'smtp',
    })
    expect(logAuthSecurity).toHaveBeenCalledWith('password_reset_requested', {
      userId: 'user-1',
      email: 'user@example.com',
      deliveryMode: 'smtp',
    })
    expect(logAuthSecurity).toHaveBeenCalledWith('two_factor_email_otp_sent', {
      userId: 'user-1',
      email: 'user@example.com',
      deliveryMode: 'smtp',
    })
  })
})
