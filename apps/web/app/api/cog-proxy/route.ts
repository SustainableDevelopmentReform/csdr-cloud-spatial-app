import { type NextRequest, NextResponse } from 'next/server'

// This is a workaround because DEA COGs (ACE) do not support CORS and possibly do not support range requests properly.

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get('url')
  if (!url) return NextResponse.json({ error: 'Missing url' }, { status: 400 })

  const headers: HeadersInit = {}
  const range = req.headers.get('range')
  if (range) headers['Range'] = range

  const upstream = await fetch(url, { headers })

  const res = new NextResponse(upstream.body, {
    status: upstream.status,
    headers: {
      'Content-Type':
        upstream.headers.get('Content-Type') ?? 'application/octet-stream',
      'Content-Length': upstream.headers.get('Content-Length') ?? '',
      'Content-Range': upstream.headers.get('Content-Range') ?? '',
      'Accept-Ranges': 'bytes',
      'Access-Control-Allow-Origin': '*',
    },
  })
  return res
}
