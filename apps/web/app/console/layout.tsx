import React from 'react'
import { cookies } from 'next/headers'
import { getUserServerSession } from '../../utils/getUserServerSession'
import {
  buildSessionAccess,
  canManageWorkspace,
  canViewLogs,
  formatGlobalUserRole,
  formatOrganizationRole,
} from '../../utils/access-control'
import { ConsoleShell } from './_components/console-shell'

const ConsoleLayout: React.FC<{ children: React.ReactNode }> = async ({
  children,
}) => {
  const session = await getUserServerSession()
  const cookieStore = await cookies()
  const access = buildSessionAccess(session)
  const canManage = canManageWorkspace(access)
  const canReadLogs = canViewLogs(access)
  const isAuthenticated = access.isAuthenticated
  const defaultSidebarOpen = cookieStore.get('sidebar_state')?.value !== 'false'
  const userEmail = session.user?.email ?? null
  const showEmailVerificationWarning =
    isAuthenticated && session.user?.emailVerified !== true
  const showSuperAdminTwoFactorWarning =
    access.isSuperAdmin && session.user?.twoFactorEnabled !== true
  const userRoleLabel = access.isSuperAdmin
    ? formatGlobalUserRole('super_admin')
    : access.organizationRole
      ? formatOrganizationRole(access.organizationRole)
      : formatGlobalUserRole('user')

  return (
    <>
      <style>{`
        html,
        body {
          background: rgb(245, 245, 245);
        }
      `}</style>
      <div className="min-h-screen bg-neutral-100">
        <ConsoleShell
          canManageWorkspace={canManage}
          canViewLogs={canReadLogs}
          defaultSidebarOpen={defaultSidebarOpen}
          isAuthenticated={isAuthenticated}
          isSuperAdmin={access.isSuperAdmin}
          showEmailVerificationWarning={showEmailVerificationWarning}
          showSuperAdminTwoFactorWarning={showSuperAdminTwoFactorWarning}
          userEmail={userEmail}
          userRoleLabel={userRoleLabel}
        >
          {children}
        </ConsoleShell>
      </div>
    </>
  )
}

export default ConsoleLayout
