import { SelectWithSearch } from '@repo/ui/components/ui/select-with-search'
import { FieldGroup } from '../../../../components/action'
import { useGeometryOutputs } from '../../geometries/_hooks'
import { useProductRun } from '../_hooks'

type ProductGeometryOutputSelectProps = {
  productRunId: string | null | undefined
  disabled?: boolean
} & (
  | {
      value: string[]
      onSelect: (value: string[]) => void
      multiple: true
    }
  | {
      value: string | null
      onSelect: (value: string | null) => void
      multiple?: false
    }
)

export const ProductGeometryOutputSelect = ({
  productRunId,
  disabled,
  ...props
}: ProductGeometryOutputSelectProps) => {
  const { data: productRun } = useProductRun(productRunId ?? undefined)
  const { data: geometryOutputs } = useGeometryOutputs(
    productRun?.geometriesRun.id,
  )

  return (
    <FieldGroup title="Select Geometry" disabled={!productRun || disabled}>
      {props.multiple ? (
        <SelectWithSearch
          options={geometryOutputs?.data}
          value={props.value ?? []}
          onSelect={props.onSelect}
          onSearch={() => {}}
          disabled={!productRun}
          multiple
        />
      ) : (
        <SelectWithSearch
          options={geometryOutputs?.data}
          value={props.value ?? null}
          onSelect={props.onSelect}
          onSearch={() => {}}
          disabled={!productRun}
        />
      )}
    </FieldGroup>
  )
}
