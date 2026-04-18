'use client'

import Image from 'next/image'
import type { ReactNode } from 'react'

type AuthPageShellProps = {
  title: string
  description: string
  children: ReactNode
  footer?: ReactNode
}

const AuthPageShell = ({
  title,
  description,
  children,
  footer,
}: AuthPageShellProps) => {
  return (
    <div className="flex min-h-screen items-center bg-neutral-100 p-4 sm:p-6">
      <div className="mx-auto flex w-full max-w-[1280px] flex-col gap-6 lg:h-[794px] lg:flex-row">
        <div className="flex flex-1 rounded-2xl bg-white">
          <div className="flex w-full items-center justify-center px-6 py-10 sm:px-10 sm:py-12">
            <div className="flex w-full max-w-96 flex-col gap-6">
              <div className="flex flex-col gap-6">
                <div className="flex h-12 items-center">
                  <Image
                    src="/branding/goap-logo.webp"
                    alt="Spatial Data Framework"
                    width={266}
                    height={356}
                    className="h-12 w-auto"
                    priority
                  />
                </div>
                <div className="flex flex-col gap-3">
                  <h1 className="text-3xl font-bold leading-9 text-neutral-950">
                    {title}
                  </h1>
                  <p className="text-sm leading-5 text-muted-foreground">
                    {description}
                  </p>
                </div>
              </div>
              {children}
              {footer}
            </div>
          </div>
        </div>
        <div className="relative hidden flex-1 overflow-hidden rounded-2xl lg:block">
          <Image
            src="/bg.png"
            alt=""
            fill
            className="object-cover object-left-top"
            sizes="(min-width: 1024px) 50vw, 100vw"
            priority
          />
        </div>
      </div>
    </div>
  )
}

export default AuthPageShell
