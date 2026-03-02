'use client'

import { cn } from '@repo/ui/lib/utils'
import React from 'react'

interface AuthShellProps {
  eyebrow: string
  title: string
  description: string
  children: React.ReactNode
  footer?: React.ReactNode
  className?: string
  panelClassName?: string
}

const displayFont =
  '"Iowan Old Style", "Palatino Linotype", Palatino, "Book Antiqua", serif'

export function AuthShell({
  eyebrow,
  title,
  description,
  children,
  footer,
  className,
  panelClassName,
}: AuthShellProps) {
  return (
    <div
      className={cn(
        'relative isolate min-h-screen overflow-hidden bg-[#efe5d4] px-6 py-10 text-stone-900',
        className,
      )}
    >
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-x-[-15%] top-[-15%] h-[340px] rounded-full bg-[radial-gradient(circle_at_center,_rgba(180,91,46,0.22),_transparent_62%)]" />
        <div className="absolute bottom-[-12%] right-[-10%] h-[360px] w-[360px] rounded-full bg-[radial-gradient(circle_at_center,_rgba(26,64,54,0.18),_transparent_70%)]" />
        <div className="absolute left-8 top-12 h-20 w-20 rounded-full border border-stone-500/20" />
        <div className="absolute bottom-20 left-1/2 h-px w-40 -translate-x-1/2 bg-stone-700/15" />
      </div>

      <div className="relative mx-auto grid min-h-[calc(100vh-5rem)] w-full max-w-6xl items-center gap-8 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="hidden lg:block">
          <div className="max-w-xl space-y-8">
            <div className="space-y-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.45em] text-stone-500">
                Account security
              </p>
              <h1
                className="max-w-lg text-6xl leading-[0.95] text-stone-950"
                style={{ fontFamily: displayFont }}
              >
                Calm access, deliberate controls.
              </h1>
              <p className="max-w-md text-base leading-7 text-stone-700">
                Verification, recovery, and second-factor protection should feel
                intentional. These flows keep the control surface compact while
                still handling the hard edges of account security.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-[28px] border border-stone-700/10 bg-white/55 p-5 backdrop-blur-sm">
                <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.3em] text-stone-500">
                  Recovery
                </div>
                <div
                  className="text-xl leading-tight text-stone-950"
                  style={{ fontFamily: displayFont }}
                >
                  Reset links and backup codes without account enumeration.
                </div>
              </div>
              <div className="rounded-[28px] border border-stone-700/10 bg-[#1d3d35] p-5 text-stone-100 shadow-[0_18px_50px_rgba(20,40,35,0.18)]">
                <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.3em] text-stone-300">
                  Verification
                </div>
                <div
                  className="text-xl leading-tight"
                  style={{ fontFamily: displayFont }}
                >
                  TOTP first, email OTP available when the moment demands it.
                </div>
              </div>
            </div>
          </div>
        </div>

        <div
          className={cn(
            'rounded-[32px] border border-stone-800/10 bg-[linear-gradient(180deg,_rgba(255,250,244,0.96),_rgba(252,246,238,0.92))] p-6 shadow-[0_30px_90px_rgba(61,36,13,0.12)] backdrop-blur md:p-8',
            panelClassName,
          )}
        >
          <div className="mb-8 space-y-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.42em] text-stone-500">
              {eyebrow}
            </p>
            <h2
              className="text-4xl leading-none text-stone-950"
              style={{ fontFamily: displayFont }}
            >
              {title}
            </h2>
            <p className="max-w-xl text-sm leading-6 text-stone-600">
              {description}
            </p>
          </div>

          <div>{children}</div>

          {footer ? (
            <div className="mt-10 border-t border-stone-900/10 pt-5 text-sm text-stone-600">
              {footer}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}
