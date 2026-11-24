import { DrizzleQueryError } from 'drizzle-orm'
import { DatabaseError } from 'pg'
import { describe, expect, it } from 'vitest'
import { foreignKeyConflictError } from './error'

const databaseError = (code: string) => {
  const error = new DatabaseError(
    'update or delete on table "parent" violates foreign key constraint',
    0,
    'error',
  )
  error.code = code
  error.constraint = 'child_parent_id_parent_id_fk'
  error.table = 'child'
  error.detail = 'Key (id)=(parent-1) is still referenced from table "child".'
  return error
}

describe('foreignKeyConflictError', () => {
  it('maps a foreign key violation wrapped by drizzle to 409', () => {
    const error = new DrizzleQueryError(
      'delete from "parent" where "id" = $1',
      ['parent-1'],
      databaseError('23503'),
    )

    const conflict = foreignKeyConflictError(error)

    expect(conflict?.response).toEqual({
      statusCode: 409,
      message: 'Conflict with related records',
      description: expect.stringContaining('referenced by other records'),
      data: null,
    })
  })

  it('maps an unwrapped foreign key violation and includes detail on request', () => {
    const conflict = foreignKeyConflictError(databaseError('23503'), {
      includeDetail: true,
    })

    expect(conflict?.response.statusCode).toBe(409)
    expect(conflict?.response.data).toEqual({
      constraint: 'child_parent_id_parent_id_fk',
      table: 'child',
      detail: 'Key (id)=(parent-1) is still referenced from table "child".',
    })
  })

  it('ignores other database errors and non-database errors', () => {
    expect(foreignKeyConflictError(databaseError('23505'))).toBeNull()
    expect(
      foreignKeyConflictError(
        new DrizzleQueryError('select 1', [], databaseError('42P01')),
      ),
    ).toBeNull()
    expect(foreignKeyConflictError(new Error('boom'))).toBeNull()
    expect(foreignKeyConflictError(null)).toBeNull()
  })
})
