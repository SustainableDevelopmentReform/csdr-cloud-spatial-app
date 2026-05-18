import { describe, expect, it } from 'vitest'
import {
  auditLogEntrySchema,
  auditLogListResponseSchema,
  auditLogQuerySchema,
  auditLogResponseSchema,
} from '../src/audit-log'

const auditLogEntry = {
  id: 'log-1',
  createdAt: '2026-01-01T00:00:00.000Z',
  actorUserId: null,
  actorUser: null,
  actorRole: null,
  activeOrganizationId: null,
  targetOrganizationId: 'org-1',
  resourceType: 'dataset',
  resourceId: null,
  action: 'read',
  decision: 'allow',
  requestPath: '/api/v0/dataset',
  requestMethod: 'GET',
  ipAddress: null,
  userAgent: null,
  details: null,
}

describe('audit log schemas', () => {
  it('coerces pagination query values and accepts supported filters', () => {
    expect(
      auditLogQuerySchema.parse({
        page: '2',
        size: '25',
        resourceType: 'dataset',
        action: 'read',
        search: 'forest',
        decision: 'allow',
        requestKind: 'mutating',
        sort: 'resourceType',
        order: 'asc',
      }),
    ).toEqual({
      page: 2,
      size: 25,
      resourceType: 'dataset',
      action: 'read',
      search: 'forest',
      decision: 'allow',
      requestKind: 'mutating',
      sort: 'resourceType',
      order: 'asc',
    })
  })

  it('rejects unsupported enum query values', () => {
    expect(
      auditLogQuerySchema.safeParse({
        decision: 'maybe',
      }).success,
    ).toBe(false)
    expect(
      auditLogQuerySchema.safeParse({
        requestKind: 'write',
      }).success,
    ).toBe(false)
    expect(
      auditLogQuerySchema.safeParse({
        sort: 'actorUserId',
      }).success,
    ).toBe(false)
  })

  it('accepts nullable actor and request metadata in entries', () => {
    expect(auditLogEntrySchema.parse(auditLogEntry)).toEqual(auditLogEntry)
  })

  it('accepts list and wrapped response shapes', () => {
    const listResponse = {
      pageCount: 1,
      totalCount: 1,
      data: [
        {
          ...auditLogEntry,
          actorUserId: 'user-1',
          actorUser: {
            id: 'user-1',
            name: 'Admin User',
            email: 'admin@example.com',
          },
          actorRole: 'admin',
          activeOrganizationId: 'org-1',
          resourceId: 'dataset-1',
          ipAddress: '127.0.0.1',
          userAgent: 'vitest',
          details: {
            reason: 'unit test',
          },
        },
      ],
    }

    expect(auditLogListResponseSchema.parse(listResponse)).toEqual(listResponse)
    expect(
      auditLogResponseSchema.parse({
        data: listResponse,
      }),
    ).toEqual({
      data: listResponse,
    })
  })
})
