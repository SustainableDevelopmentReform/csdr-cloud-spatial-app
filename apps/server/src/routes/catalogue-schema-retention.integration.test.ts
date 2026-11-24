import { expect, it, vi } from 'vitest'
import { seededIds, setupIsolatedTestFile } from '~/test-utils/integration'

const { app, createSessionHeaders } = await setupIsolatedTestFile(
  import.meta.url,
)
const { zodToOpenAPIRegistry } = await import('@asteasolutions/zod-to-openapi')

it('keeps catalogue reads stable without retaining new OpenAPI schemas per request', async () => {
  const headers = await createSessionHeaders({ role: 'super_admin' })
  const targets = [
    `dataset/${seededIds.dataset}`,
    `dataset-run/${seededIds.datasetRun}`,
    `geometries-run/${seededIds.geometriesRun}`,
    `product-run/${seededIds.productRun}`,
    `product-output/${seededIds.productOutputTasmania2021}`,
    `report/${seededIds.report}`,
  ]
  const read = async (target: string) => {
    const response = await app.request(`/api/v0/${target}`, { headers })
    expect(response.status, target).toBe(200)
    return response.json()
  }
  const expected = new Map<string, unknown>()
  for (const target of targets) expected.set(target, await read(target))

  // This library's metadata registry retains added schemas strongly. Repeated
  // reads must not add schemas; counting registrations is deterministic and
  // avoids relying on garbage-collector timing or a machine-specific heap limit.
  const registrations = vi.spyOn(zodToOpenAPIRegistry, 'add')
  try {
    for (let repeat = 0; repeat < 3; repeat++) {
      for (const target of targets) {
        expect(await read(target), target).toEqual(expected.get(target))
      }
    }
    expect(registrations).not.toHaveBeenCalled()
  } finally {
    registrations.mockRestore()
  }
})
