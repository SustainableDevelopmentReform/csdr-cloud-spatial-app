'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { updateGeometryOutputSchema } from '@repo/schemas/crud'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from '@repo/ui/components/ui/form'
import { Input } from '@repo/ui/components/ui/input'
import { Textarea } from '@repo/ui/components/ui/textarea'
import { bbox } from '@turf/turf'
import { Layer, Source } from '@vis.gl/react-maplibre'
import type { FeatureCollection, Geometry } from 'geojson'
import { useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useEffect, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { ConsolePageHeader } from '~/app/console/_components/console-page-header'
import {
  getEditModeHref,
  OverviewSection,
  OverviewText,
  ResourceHeaderActions,
  ResourceTitleBlock,
} from '~/app/console/_components/resource-detail-mode'
import { CrudForm } from '../../../../../components/form/crud-form'
import { useAccessControl } from '../../../../../hooks/use-access-control'
import { GEOMETRIES_RUNS_OUTPUTS_BASE_PATH } from '../../../../../lib/paths'
import { canManageConsoleChildResource } from '../../../../../utils/access-control'
import { toastError } from '../../../../../utils/error-handling'
import { ResourcePageState } from '../../../_components/resource-page-state'
import { GeometriesBreadcrumbs } from '../../_components/breadcrumbs'
import { MapViewer } from '../../_components/map-viewer'
import {
  type GeometryOutputDetail,
  type UpdateGeometryOutputPayload,
  useGeometriesRun,
  useGeometryOutput,
  useUpdateGeometryOutput,
} from '../../_hooks'

const formId = 'geometry-output-detail-form'

const getGeometryOutputPath = (geometryOutputId: string) =>
  `${GEOMETRIES_RUNS_OUTPUTS_BASE_PATH}/${geometryOutputId}`

const getGeometryOutputFormValues = (
  geometryOutput: GeometryOutputDetail,
): UpdateGeometryOutputPayload => ({
  description: geometryOutput.description,
})

function toFeatureProperties(value: unknown): Record<string, unknown> | null {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return null
  }

  return Object.fromEntries(Object.entries(value))
}

function createGeometryFeatureCollection(
  geometryOutput: GeometryOutputDetail | null | undefined,
): FeatureCollection<Geometry, Record<string, unknown> | null> | null {
  if (!geometryOutput?.geometry) {
    return null
  }

  return {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        geometry: geometryOutput.geometry,
        properties: toFeatureProperties(geometryOutput.properties),
      },
    ],
  }
}

const GeometryOutputDetails = () => {
  const geometryOutputQuery = useGeometryOutput()
  const geometryOutput = geometryOutputQuery.data
  const geometriesRunQuery = useGeometriesRun(
    geometryOutput?.geometriesRun.id,
    Boolean(geometryOutput?.geometriesRun.id),
  )
  const updateGeometryOutput = useUpdateGeometryOutput()
  const { access } = useAccessControl()
  const canEdit = canManageConsoleChildResource({
    access,
    resourceData: geometriesRunQuery.data ?? geometryOutput,
  })
  const router = useRouter()
  const searchParams = useSearchParams()
  const isEditMode = searchParams.get('mode') === 'edit' && canEdit
  const resourcePath = geometryOutput
    ? getGeometryOutputPath(geometryOutput.id)
    : GEOMETRIES_RUNS_OUTPUTS_BASE_PATH
  const geometryData = useMemo(
    () => createGeometryFeatureCollection(geometryOutput),
    [geometryOutput],
  )

  const geometryBbox = useMemo<
    [number, number, number, number] | undefined
  >(() => {
    if (!geometryData) {
      return undefined
    }

    const [minLon, minLat, maxLon, maxLat] = bbox(geometryData)
    return [minLon, minLat, maxLon, maxLat]
  }, [geometryData])

  const form = useForm<UpdateGeometryOutputPayload>({
    resolver: zodResolver(updateGeometryOutputSchema),
    defaultValues: {
      description: null,
    },
  })
  const isDirty = form.formState.isDirty

  useEffect(() => {
    if (geometryOutput && !isDirty) {
      form.reset(getGeometryOutputFormValues(geometryOutput))
    }
  }, [form, geometryOutput, isDirty])

  const discardEdits = useCallback(() => {
    if (!geometryOutput) {
      return
    }

    if (
      isDirty &&
      !window.confirm(
        'You have unsaved changes. Are you sure you want to discard your edits?',
      )
    ) {
      return
    }

    form.reset(getGeometryOutputFormValues(geometryOutput))
    router.replace(resourcePath)
  }, [form, geometryOutput, isDirty, resourcePath, router])

  const mapPreview = (
    <div className="h-96 overflow-hidden rounded-lg">
      {geometryBbox && geometryData ? (
        <MapViewer
          initialViewState={{
            bounds: geometryBbox,
            fitBoundsOptions: { padding: 100 },
          }}
        >
          <Source id="geojson" type="geojson" data={geometryData} />
          <Layer
            id="geojson-line"
            source="geojson"
            type="line"
            paint={{
              'line-color': 'black',
              'line-width': 2,
            }}
          />
          <Layer
            id="geojson-fill"
            source="geojson"
            type="fill"
            paint={{
              'fill-color': 'black',
              'fill-opacity': 0.2,
            }}
          />
        </MapViewer>
      ) : null}
    </div>
  )

  return (
    <div className="flex flex-col bg-neutral-100 text-foreground">
      <ConsolePageHeader
        actions={
          geometryOutput ? (
            <ResourceHeaderActions
              canEdit={canEdit}
              editHref={getEditModeHref(resourcePath)}
              formId={formId}
              isEditMode={isEditMode}
              onDiscard={discardEdits}
              resourcePath={resourcePath}
              resourceTypeLabel="Boundary feature"
              savePending={updateGeometryOutput.isPending}
            />
          ) : null
        }
        breadcrumbs={<GeometriesBreadcrumbs />}
        className="border-b border-border"
      />
      <ResourcePageState
        error={geometryOutputQuery.error}
        errorMessage="Failed to load boundary feature"
        isLoading={geometryOutputQuery.isLoading}
        loadingMessage="Loading boundary feature"
        notFoundMessage="Boundary feature not found"
      >
        {geometryOutput ? (
          <Form {...form}>
            <div className="flex flex-col p-4">
              <div className="flex w-full flex-col gap-4 rounded-2xl px-4 pb-8 pt-6 sm:px-8">
                <div className="flex items-start justify-between gap-4">
                  {isEditMode ? (
                    <div className="flex w-full max-w-[462px] flex-col items-start gap-2">
                      <ResourceTitleBlock
                        title={
                          geometryOutput.name ?? 'Untitled boundary feature'
                        }
                        description="Boundary feature"
                      />
                      <FormField
                        control={form.control}
                        name="description"
                        render={({ field }) => (
                          <FormItem className="w-full">
                            <FormControl>
                              <Input
                                {...field}
                                className="h-9 rounded-lg border-input bg-transparent px-3 py-1 text-sm leading-5 shadow-none"
                                placeholder="Description"
                                value={field.value ?? ''}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  ) : (
                    <ResourceTitleBlock
                      title={geometryOutput.name ?? 'Untitled boundary feature'}
                      description={
                        geometryOutput.description ?? 'No description'
                      }
                    />
                  )}
                </div>

                {isEditMode ? (
                  <CrudForm
                    form={form}
                    formId={formId}
                    mutation={updateGeometryOutput}
                    entityName="Boundary Feature"
                    entityNamePlural="boundary features"
                    hiddenFields={[
                      'id',
                      'name',
                      'description',
                      'metadata',
                      'visibility',
                    ]}
                    showSubmitAction={false}
                    successMessage="Boundary feature saved"
                    onError={(error) =>
                      toastError(error, 'Failed to update boundary feature')
                    }
                    onSuccess={() => router.replace(resourcePath)}
                  >
                    <FormItem>
                      <Textarea
                        className="min-h-40 bg-gray-100 font-mono"
                        disabled
                        value={JSON.stringify(
                          geometryOutput.properties,
                          null,
                          2,
                        )}
                      />
                      <FormMessage />
                    </FormItem>
                  </CrudForm>
                ) : (
                  <>
                    {mapPreview}
                    <div className="flex w-full max-w-[720px] flex-col gap-4">
                      <OverviewSection title="About">
                        <OverviewText>
                          {geometryOutput.description ?? 'No description.'}
                        </OverviewText>
                      </OverviewSection>
                      <OverviewSection title="Properties">
                        <Textarea
                          className="min-h-40 bg-gray-100 font-mono"
                          disabled
                          value={JSON.stringify(
                            geometryOutput.properties,
                            null,
                            2,
                          )}
                        />
                      </OverviewSection>
                    </div>
                  </>
                )}
              </div>
            </div>
          </Form>
        ) : null}
      </ResourcePageState>
    </div>
  )
}

export default GeometryOutputDetails
