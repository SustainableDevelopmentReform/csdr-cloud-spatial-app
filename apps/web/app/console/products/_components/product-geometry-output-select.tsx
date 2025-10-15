import { SelectWithSearch } from '@repo/ui/components/ui/select-with-search'
import { FieldGroup } from '../../../../components/action'
import {
  GeometryOutputListItem,
  useGeometryOutputs,
} from '../../geometries/_hooks'
import { useProductRun } from '../_hooks'

export const ProductGeometryOutputSelect = ({
  productRunId,
  value,
  onChange,
  disabled,
}: {
  productRunId: string | null | undefined
  value: string | null | undefined
  onChange: (id: string | null, geometry: GeometryOutputListItem | null) => void
  disabled?: boolean
}) => {
  const { data: productRun } = useProductRun(productRunId ?? undefined)
  const { data: geometryOutputs } = useGeometryOutputs(
    productRun?.geometriesRun.id,
  )

  return (
    <FieldGroup
      className="flex-1"
      title="Select Geometry"
      disabled={!!(!productRun || disabled)}
    >
      <SelectWithSearch
        options={geometryOutputs?.data}
        value={value ?? null}
        onSelect={(value) => {
          onChange(
            value,
            geometryOutputs?.data?.find((geometry) => geometry.id === value) ??
              null,
          )
        }}
        onSearch={() => {}}
        disabled={!!(!productRun || disabled)}
      />
    </FieldGroup>
  )
}
