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
  const firstGroup = Array.from({ length: midpoint }, (_, index) => index)
  const secondGroup = Array.from(
    { length: length - midpoint },
    (_, index) => index + midpoint,
  )

  return (
    <InputOTP
      value={value}
      onChange={onChange}
      disabled={disabled}
      maxLength={length}
      pattern={REGEXP_ONLY_DIGITS}
      containerClassName="w-full justify-center"
    >
      {length > 4 ? (
        <>
          <InputOTPGroup>
            {firstGroup.map((index) => (
              <InputOTPSlot key={index} index={index} />
            ))}
          </InputOTPGroup>
          <InputOTPSeparator className="mx-1 text-stone-400" />
          <InputOTPGroup>
            {secondGroup.map((index) => (
              <InputOTPSlot key={index} index={index} />
            ))}
          </InputOTPGroup>
        </>
      ) : (
        <InputOTPGroup>
          {secondGroup.map((index) => (
            <InputOTPSlot key={index} index={index} />
          ))}
        </InputOTPGroup>
      )}
    </InputOTP>
  )
}
