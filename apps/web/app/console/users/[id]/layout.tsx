import { ChevronLeft } from 'lucide-react'
import React from 'react'
import Link from '~/components/link'

const UserDetailLayout: React.FC<{
  children?: React.ReactNode
}> = async ({ children }) => {
  return (
    <main>
      <div className="flex items-center justify-start gap-4">
        <Link href="/console/users" className="font-medium flex items-center">
          <ChevronLeft className="h-5 w-5" />
          Back
        </Link>
      </div>

      <div className="pt-4">{children}</div>
    </main>
  )
}

export default UserDetailLayout
