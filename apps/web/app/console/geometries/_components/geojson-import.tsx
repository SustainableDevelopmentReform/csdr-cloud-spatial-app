import { zodResolver } from '@hookform/resolvers/zod'
import { importGeometriesRunSchema } from '@repo/schemas/crud'
import { Badge } from '@repo/ui/components/ui/badge'
import { Button } from '@repo/ui/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@repo/ui/components/ui/dialog'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@repo/ui/components/ui/form'
import { Input } from '@repo/ui/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@repo/ui/components/ui/select'
import { toast } from '@repo/ui/components/ui/sonner'
import { Textarea } from '@repo/ui/components/ui/textarea'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@repo/ui/components/ui/tooltip'
import { cn } from '@repo/ui/lib/utils'
import type { FeatureCollection } from 'geojson'
import {
  ChangeEvent,
  DragEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { ImportGeometriesRunPayload, useImportGeometriesRun } from '../_hooks'

type ImportGeometriesRunFormValues = z.infer<typeof importGeometriesRunSchema>

type GeojsonSummary = {
  featureCount: number
  propertyNames: Record<string, string[]>
  fileName: string
  fileSize: number
  warnings: string[]
}

const formatBytes = (size: number) => {
  if (!Number.isFinite(size) || size <= 0) {
    return '0 B'
  }

  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  const exponent = Math.min(
    Math.floor(Math.log(size) / Math.log(1024)),
    units.length - 1,
  )
  const value = size / Math.pow(1024, exponent)
  return `${value.toFixed(exponent === 0 ? 0 : 1)} ${units[exponent]}`
}

const readGeojsonSummary = async (file: File): Promise<GeojsonSummary> => {
  let parsed: FeatureCollection
  try {
    parsed = JSON.parse(await file.text()) as FeatureCollection
  } catch (error) {
    throw new Error(
      error instanceof Error ? error.message : 'GeoJSON file is not valid JSON',
    )
  }

  if (parsed.type !== 'FeatureCollection' || !Array.isArray(parsed.features)) {
    throw new Error('GeoJSON must be a FeatureCollection with features')
  }

  if (parsed.features.length === 0) {
    throw new Error('GeoJSON file does not contain any features')
  }

  const warnings: string[] = []

  const propertyNames: Record<string, string[]> = {}
  const validFeatures = parsed.features.filter((feature, index) => {
    if (!feature || typeof feature !== 'object') {
      console.warn(`Feature ${index + 1} is not valid`, feature)
      warnings.push(
        `Feature ${index + 1} is not valid (see console for details)`,
      )
      return false
    }

    if (!feature.geometry) {
      console.warn(`Feature ${index + 1} is missing geometry`, feature)
      warnings.push(
        `Feature ${index + 1} is missing geometry (see console for details)`,
      )
      return false
    }

    if (
      feature.geometry.type !== 'Polygon' &&
      feature.geometry.type !== 'MultiPolygon'
    ) {
      console.warn(
        `Feature ${index + 1} geometry must be Polygon or MultiPolygon`,
        feature,
      )
      warnings.push(
        `Feature ${index + 1} geometry must be Polygon or MultiPolygon (see console for details)`,
      )
      return false
    }

    if (feature.properties && typeof feature.properties === 'object') {
      Object.keys(feature.properties).forEach((key) => {
        if (!propertyNames[key]) {
          propertyNames[key] = []
        }
        if (propertyNames[key].length < 10) {
          propertyNames[key].push(JSON.stringify(feature.properties?.[key]))
        }
      })
    }

    return true
  })

  return {
    featureCount: validFeatures.length,
    warnings,
    propertyNames,
    fileName: file.name,
    fileSize: file.size,
  }
}

const GeojsonImportForm = ({
  geometriesId,
  onCompleted,
}: {
  geometriesId?: string
  onCompleted: () => void
}) => {
  const defaultValues = useMemo(
    () => ({
      geometriesId: geometriesId,
    }),
    [geometriesId],
  )

  const form = useForm<ImportGeometriesRunFormValues>({
    resolver: zodResolver(importGeometriesRunSchema),
    defaultValues,
  })

  useEffect(() => {
    if (geometriesId) {
      form.setValue('geometriesId', geometriesId)
    }
  }, [geometriesId, form])

  const importGeometriesRun = useImportGeometriesRun()
  const [geojsonSummary, setGeojsonSummary] = useState<GeojsonSummary | null>(
    null,
  )
  const [dropError, setDropError] = useState<string | null>(null)
  const [isDragActive, setIsDragActive] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const resetGeojsonState = useCallback(() => {
    setGeojsonSummary(null)
    setDropError(null)
    setSelectedFile(null)
    form.resetField('geojsonFile')
    form.resetField('geojsonIdProperty')
    form.resetField('geojsonNameProperty')
    setIsDragActive(false)
  }, [form])

  const processFile = useCallback(
    async (file: File) => {
      try {
        const summary = await readGeojsonSummary(file)
        setGeojsonSummary(summary)
        setDropError(null)
        setSelectedFile(file)
        form.setValue('geojsonFile', file, { shouldValidate: true })
        form.clearErrors('geojsonFile')

        if (summary.propertyNames.length) {
          const firstProperty = Object.keys(summary.propertyNames)[0]
          const secondProperty = Object.keys(summary.propertyNames)[1]

          if (firstProperty) form.setValue('geojsonIdProperty', firstProperty)
          if (secondProperty)
            form.setValue('geojsonNameProperty', secondProperty)
        }
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Failed to read GeoJSON file'
        setDropError(message)
        setGeojsonSummary(null)
        setSelectedFile(null)
        form.setError('geojsonFile', { message })
      }
    },
    [form],
  )

  const handleClearFile = useCallback(() => {
    resetGeojsonState()
  }, [resetGeojsonState])

  const handleBrowseClick = useCallback(() => {
    fileInputRef.current?.click()
  }, [])

  const handleFileInputChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0]
      if (file) {
        void processFile(file)
      }
      event.target.value = ''
    },
    [processFile],
  )

  const handleDragOver = useCallback((event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    setIsDragActive(true)
  }, [])

  const handleDragLeave = useCallback((event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    if (
      event.currentTarget.contains(event.relatedTarget as Node | null) &&
      event.relatedTarget !== null
    ) {
      return
    }
    setIsDragActive(false)
  }, [])

  const handleDrop = useCallback(
    (event: DragEvent<HTMLDivElement>) => {
      event.preventDefault()
      setIsDragActive(false)
      const file = event.dataTransfer.files?.[0]
      if (file) {
        void processFile(file)
      }
    },
    [processFile],
  )

  const getErrorMessage = (error: unknown) => {
    if (
      typeof error === 'object' &&
      error !== null &&
      'message' in error &&
      typeof (error as { message?: unknown }).message === 'string'
    ) {
      return (error as { message: string }).message
    }

    return 'Failed to import GeoJSON'
  }

  const onSubmit = form.handleSubmit((values) => {
    if (!values.geojsonFile || !selectedFile) {
      const message = 'Please add a GeoJSON file before importing'
      setDropError(message)
      form.setError('geojsonFile', { message })
      return
    }

    setDropError(null)

    const payload: ImportGeometriesRunPayload = {
      ...values,
      geojsonFile: values.geojsonFile,
    }

    importGeometriesRun.mutate(payload, {
      onSuccess: (response) => {
        if (response?.data.warnings?.length) {
          toast.warning('GeoJSON import completed with warnings', {
            description: response?.data.warnings.join('\n'),
          })
        } else {
          toast.success('GeoJSON import completed')
        }
        const currentGeometriesId =
          response?.data.geometriesRun?.geometries?.id ?? geometriesId ?? ''
        form.reset({
          ...defaultValues,
          geometriesId: currentGeometriesId,
        })
        resetGeojsonState()
        onCompleted()
      },
      onError: (error) => {
        const message = getErrorMessage(error)
        setDropError(message)
        form.setError('geojsonFile', { message })
        toast.error(message)
      },
    })
  })

  const isImporting = importGeometriesRun.isPending

  return (
    <Form {...form}>
      <form onSubmit={onSubmit}>
        <div className="grid gap-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Name</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="My geometries run" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Description</FormLabel>
                <FormControl>
                  <Textarea
                    {...field}
                    value={field.value ?? ''}
                    placeholder="Optional description"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="metadata"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Metadata</FormLabel>
                <FormControl>
                  <Textarea
                    {...field}
                    value={
                      typeof field.value === 'object'
                        ? JSON.stringify(field.value, null, 2)
                        : (field.value ?? '')
                    }
                    placeholder="Optional JSON metadata"
                    className="font-mono"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="geojsonFile"
            render={() => (
              <FormItem>
                <FormLabel>GeoJSON file</FormLabel>
                <div className="grid gap-2">
                  <div
                    className={cn(
                      'rounded-lg border border-dashed border-gray-300 p-6 text-center transition-colors',
                      {
                        'opacity-50 pointer-events-none': isImporting,
                        'bg-muted': isDragActive,
                      },
                    )}
                    onDragOver={handleDragOver}
                    onDragEnter={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    role="button"
                    tabIndex={0}
                  >
                    <div className="flex flex-col items-center gap-2 text-sm text-muted-foreground">
                      <p className="font-medium text-foreground">
                        Drag & drop your GeoJSON file here
                      </p>
                      <p>Only Polygon and MultiPolygon features are allowed.</p>
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={handleBrowseClick}
                          disabled={isImporting}
                        >
                          Browse files
                        </Button>
                        {geojsonSummary && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={handleClearFile}
                            disabled={isImporting}
                          >
                            Remove file
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>

                  <input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    accept=".geojson,.json,application/geo+json,application/json"
                    onChange={handleFileInputChange}
                  />

                  {geojsonSummary ? (
                    <div className="rounded-md border bg-muted/40 p-4 text-sm text-muted-foreground space-y-2 text-left">
                      <div className="font-medium text-foreground">
                        {geojsonSummary.fileName} ·{' '}
                        {formatBytes(geojsonSummary.fileSize)}
                      </div>
                      <div>
                        {geojsonSummary.featureCount} feature
                        {geojsonSummary.featureCount === 1 ? '' : 's'}
                      </div>
                      {geojsonSummary.warnings.length ? (
                        <ul className="list-disc pl-5 text-amber-600">
                          {geojsonSummary.warnings.map((warning) => (
                            <li key={warning}>{warning}</li>
                          ))}
                        </ul>
                      ) : null}
                      {Object.keys(geojsonSummary.propertyNames).length ? (
                        <div className="flex flex-wrap gap-2">
                          {Object.entries(geojsonSummary.propertyNames).map(
                            ([property, samples], index) => (
                              <Tooltip key={`${property}-${index}`}>
                                <TooltipTrigger>
                                  <Badge variant="secondary">{property}</Badge>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <ul className="list-disc pl-5">
                                    {samples.map((sample, index) => (
                                      <li key={`${sample}-${index}`}>
                                        {sample}
                                      </li>
                                    ))}
                                  </ul>
                                </TooltipContent>
                              </Tooltip>
                            ),
                          )}
                        </div>
                      ) : (
                        <p className="text-destructive">
                          No properties were found in this file.
                        </p>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground text-left">
                      Drop a GeoJSON file to preview available feature
                      properties.
                    </p>
                  )}

                  {dropError ? (
                    <p className="text-sm text-destructive">{dropError}</p>
                  ) : null}
                </div>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid gap-4 md:grid-cols-2">
            <FormField
              control={form.control}
              name="geojsonIdProperty"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Feature property for ID</FormLabel>
                  <Select
                    value={field.value}
                    onValueChange={(value) => field.onChange(value)}
                    disabled={
                      !Object.keys(geojsonSummary?.propertyNames ?? {}).length
                    }
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select property" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {Object.keys(geojsonSummary?.propertyNames ?? {}).map(
                        (property) => (
                          <SelectItem key={property} value={property}>
                            {property}
                          </SelectItem>
                        ),
                      )}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="geojsonNameProperty"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Feature property for name</FormLabel>
                  <Select
                    value={field.value}
                    onValueChange={(value) => field.onChange(value)}
                    disabled={
                      !Object.keys(geojsonSummary?.propertyNames ?? {}).length
                    }
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select property" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {Object.keys(geojsonSummary?.propertyNames ?? {}).map(
                        (property) => (
                          <SelectItem key={property} value={property}>
                            {property}
                          </SelectItem>
                        ),
                      )}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <div className="flex justify-end">
            <Button type="submit" disabled={isImporting}>
              {isImporting ? 'Importing...' : 'Import GeoJSON'}
            </Button>
          </div>
        </div>
      </form>
    </Form>
  )
}

export const GeojsonImportDialog = ({
  geometriesId,
}: {
  geometriesId?: string
}) => {
  const [isOpen, setIsOpen] = useState(false)
  const [formKey, setFormKey] = useState(0)

  const handleOpenChange = (next: boolean) => {
    setIsOpen(next)
    if (!next) {
      setFormKey((prev) => prev + 1)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <span>
          <Button variant="outline" disabled={!geometriesId}>
            Import GeoJSON
          </Button>
        </span>
      </DialogTrigger>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Import GeoJSON</DialogTitle>
        </DialogHeader>
        {isOpen ? (
          <GeojsonImportForm
            key={formKey}
            geometriesId={geometriesId}
            onCompleted={() => handleOpenChange(false)}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  )
}
