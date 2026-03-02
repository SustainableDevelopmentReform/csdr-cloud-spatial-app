export function getTotpSetupDetails(totpURI: string) {
  try {
    const uri = new URL(totpURI)
    const secret = uri.searchParams.get('secret')
    const issuer = uri.searchParams.get('issuer')
    const account = decodeURIComponent(uri.pathname.replace(/^\//, ''))

    return {
      account,
      issuer,
      secret,
    }
  } catch {
    return {
      account: null,
      issuer: null,
      secret: null,
    }
  }
}
