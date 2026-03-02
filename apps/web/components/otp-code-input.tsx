'use client'

import {
  InputOTP,
  InputOTPGroup,
  InputOTPSeparator,
  InputOTPSlot,
  REGEXP_ONLY_DIGITS,
} from '@repo/ui/components/ui/input-otp'

interface OTPCodeInputProps {
  value: string
  onChange: (value: string) => void
  disabled?: boolean
  length?: number
}

export function OTPCodeInput({
  value,
  onChange,
  disabled,
  length = 6,
}: OTPCodeInputProps) {
  const midpoint = Math.floor(length / 2)

  return (
    <InputOTP
      value={value}
      onChange={onChange}
      disabled={disabled}
      maxLength={length}
      pattern={REGEXP_ONLY_DIGITS}
      containerClassName="w-full justify-center"
    >
      <InputOTPGroup>
        {Array.from({ length }).map((_, index) => (
          <div key={index} className="flex items-center">
            {length > 4 && index === midpoint ? (
              <InputOTPSeparator className="mx-1 text-stone-400" />
            ) : null}
            <InputOTPSlot index={index} />
          </div>
        ))}
      </InputOTPGroup>
    </InputOTP>
  )
}
