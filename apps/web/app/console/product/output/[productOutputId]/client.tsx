'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { updateProductOutputSchema } from '@repo/schemas/crud'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from '@repo/ui/components/ui/form'
import { Input } from '@repo/ui/components/ui/input'
import { formatDateTime } from '@repo/ui/lib/date'
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
import { Value } from '../../../../../components/value'
import { CrudForm } from '../../../../../components/form/crud-form'
import { useAccessControl } from '../../../../../hooks/useAccessControl'
import { PRODUCTS_RUNS_OUTPUTS_BASE_PATH } from '../../../../../lib/paths'
import { canManageConsoleChildResource } from '../../../../../utils/access-control'
import { toastError } from '../../../../../utils/error-handling'
import { ResourcePageState } from '../../../_components/resource-page-state'
import { MapViewer } from '../../../geometries/_components/map-viewer'
import { IndicatorButton } from '../../../indicator/_components/indicator-button'
import { ProductsBreadcrumbs } from '../../_components/breadcrumbs'
import { ProductOutputButton } from '../../_components/product-output-button'
import {
  type ProductOutputDetail,
  type UpdateProductOutputPayload,
  useProductOutput,
  useProductRun,
  useUpdateProductOutput,
} from '../../_hooks'

const formId = 'product-output-detail-form'

const getProductOutputPath = (productOutputId: string) =>
  `${PRODUCTS_RUNS_OUTPUTS_BASE_PATH}/${productOutputId}`

const getProductOutputFormValues = (
  productOutput: ProductOutputDetail,
): UpdateProductOutputPayload => ({
  name: productOutput.name,
  description: productOutput.description,
})

function toFeatureProperties(value: unknown): Record<string, unknown> | null {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return null
  }

  return Object.fromEntries(Object.entries(value))
}

function createGeometryFeatureCollection(
  productOutput: ProductOutputDetail | null | undefined,
): FeatureCollection<Geometry, Record<string, unknown> | null> | null {
  const geometryOutput = productOutput?.geometryOutput

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

const ProductOutputDetails = () => {
  const productOutputQuery = useProductOutput()
  const productOutput = productOutputQuery.data
  const productRunQuery = useProductRun(
    productOutput?.productRun.id,
    Boolean(productOutput?.productRun.id),
  )
  const updateProductOutput = useUpdateProductOutput()
  const { access } = useAccessControl()
  const canEdit = canManageConsoleChildResource({
    access,
    resourceData: productRunQuery.data ?? productOutput,
  })
  const router = useRouter()
  const searchParams = useSearchParams()
  const isEditMode = searchParams.get('mode') === 'edit' && canEdit
  const resourcePath = productOutput
    ? getProductOutputPath(productOutput.id)
    : PRODUCTS_RUNS_OUTPUTS_BASE_PATH

  const geometryData = useMemo(
    () => createGeometryFeatureCollection(productOutput),
    [productOutput],
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

  const form = useForm<UpdateProductOutputPayload>({
    resolver: zodResolver(updateProductOutputSchema),
    defaultValues: {
      name: '',
      description: null,
    },
  })
  const isDirty = form.formState.isDirty

  useEffect(() => {
    if (productOutput && !isDirty) {
      form.reset(getProductOutputFormValues(productOutput))
    }
  }, [form, isDirty, productOutput])

  const discardEdits = useCallback(() => {
    if (!productOutput) {
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

    form.reset(getProductOutputFormValues(productOutput))
    router.replace(resourcePath)
  }, [form, isDirty, productOutput, resourcePath, router])

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
          productOutput ? (
            <ResourceHeaderActions
              canEdit={canEdit}
              editHref={getEditModeHref(resourcePath)}
              formId={formId}
              isEditMode={isEditMode}
              onDiscard={discardEdits}
              resourcePath={resourcePath}
              resourceTypeLabel="Product output"
              savePending={updateProductOutput.isPending}
            />
          ) : null
        }
        breadcrumbs={<ProductsBreadcrumbs />}
        className="border-b border-border"
      />
      <ResourcePageState
        error={productOutputQuery.error}
        errorMessage="Failed to load product output"
        isLoading={productOutputQuery.isLoading}
        loadingMessage="Loading product output"
        notFoundMessage="Product output not found"
      >
        {productOutput ? (
          <Form {...form}>
            <div className="flex flex-col p-4">
              <div className="flex w-full flex-col gap-4 rounded-2xl px-4 pb-8 pt-6 sm:px-8">
                <div className="flex items-start justify-between gap-4">
                  {isEditMode ? (
                    <div className="flex w-full max-w-[462px] flex-col items-start gap-2">
                      <FormField
                        control={form.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem className="w-full">
                            <FormControl>
                              <Input
                                {...field}
                                className="h-9 rounded-lg border-input bg-transparent px-3 py-1 text-xl font-semibold leading-7 shadow-none"
                                placeholder="Product output name"
                                value={field.value ?? ''}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
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
                      title={productOutput.name ?? 'Untitled product output'}
                      description={
                        productOutput.description ?? 'No description'
                      }
                    />
                  )}
                </div>

                {isEditMode ? (
                  <CrudForm
                    form={form}
                    formId={formId}
                    mutation={updateProductOutput}
                    entityName="Product Output"
                    entityNamePlural="product outputs"
                    hiddenFields={[
                      'id',
                      'name',
                      'description',
                      'metadata',
                      'visibility',
                    ]}
                    showSubmitAction={false}
                    successMessage="Product output saved"
                    onError={(error) =>
                      toastError(error, 'Failed to update product output')
                    }
                    onSuccess={() => router.replace(resourcePath)}
                  />
                ) : (
                  <>
                    {mapPreview}
                    <div className="flex w-full max-w-[720px] flex-col gap-4">
                      <OverviewSection title="About">
                        <OverviewText>
                          {productOutput.description ?? 'No description.'}
                        </OverviewText>
                      </OverviewSection>
                      <OverviewSection title="Output summary">
                        <div className="flex flex-col gap-3 text-base leading-6 text-muted-foreground">
                          <div>
                            <Value
                              value={productOutput.value}
                              indicator={productOutput.indicator}
                            />
                          </div>
                          <OverviewText>
                            {`Time point: ${formatDateTime(productOutput.timePoint)}`}
                          </OverviewText>
                          {productOutput.indicator ? (
                            <IndicatorButton
                              indicator={productOutput.indicator}
                            />
                          ) : null}
                        </div>
                      </OverviewSection>
                      {productOutput.dependencyProductOutputs.length > 0 ? (
                        <OverviewSection title="Derived dependencies">
                          <div className="flex flex-col gap-2">
                            {productOutput.dependencyProductOutputs.map(
                              (dependencyProductOutput) => (
                                <ProductOutputButton
                                  key={dependencyProductOutput.id}
                                  productOutput={dependencyProductOutput}
                                />
                              ),
                            )}
                          </div>
                        </OverviewSection>
                      ) : null}
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

export default ProductOutputDetails
