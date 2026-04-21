import { describe, expect, it } from 'vitest'
import { resolveAuthAuditLogContext } from '../auth-security'

const resolveContextForPath = (path: string) =>
  resolveAuthAuditLogContext({
    actor: null,
    body: null,
    request: new Request(`http://localhost${path}`),
  })

describe('resolveAuthAuditLogContext', () => {
  it.each([
    ['/api/auth/admin/ban-user', 'admin_ban_user'],
    ['/api/auth/admin/create-user', 'admin_create_user'],
    ['/api/auth/admin/get-user', 'admin_get_user'],
    ['/api/auth/admin/has-permission', 'admin_has_permission'],
    ['/api/auth/admin/impersonate-user', 'admin_impersonate_user'],
    ['/api/auth/admin/list-user-sessions', 'admin_list_user_sessions'],
    ['/api/auth/admin/list-users', 'admin_list_users'],
    ['/api/auth/admin/remove-user', 'admin_remove_user'],
    ['/api/auth/admin/revoke-user-session', 'admin_revoke_user_session'],
    ['/api/auth/admin/revoke-user-sessions', 'admin_revoke_user_sessions'],
    ['/api/auth/admin/set-role', 'admin_set_role'],
    ['/api/auth/admin/set-user-password', 'admin_set_user_password'],
    ['/api/auth/admin/stop-impersonating', 'admin_stop_impersonating'],
    ['/api/auth/admin/unban-user', 'admin_unban_user'],
    ['/api/auth/admin/update-user', 'admin_update_user'],
  ])('logs Better Auth admin route %s', async (path, expectedAction) => {
    await expect(resolveContextForPath(path)).resolves.toMatchObject({
      action: expectedAction,
    })
  })

  it('derives an audit action for future admin routes', async () => {
    await expect(
      resolveContextForPath('/api/auth/admin/future-route'),
    ).resolves.toMatchObject({
      action: 'admin_future_route',
    })
  })

  it('uses query parameters for resource ids without logging query strings', async () => {
    const context = await resolveContextForPath(
      '/api/auth/admin/get-user?id=user-123',
    )

    expect(context).toMatchObject({
      action: 'admin_get_user',
      resourceId: 'user-123',
    })
  })

  it('audits token-bearing reset password callback paths without using the token in the action', async () => {
    await expect(
      resolveContextForPath('/api/auth/reset-password/sensitive-token'),
    ).resolves.toMatchObject({
      action: 'reset_password_callback',
      resourceId: null,
    })
  })

  it('audits get-session requests', async () => {
    await expect(
      resolveContextForPath('/api/auth/get-session'),
    ).resolves.toMatchObject({
      action: 'get_session',
    })
  })
})
