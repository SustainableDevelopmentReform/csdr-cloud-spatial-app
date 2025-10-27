import { FieldGroup } from '../../../../components/action'
import { useGeometryOutputs } from '../../geometries/_hooks'
import { useProductRun } from '../_hooks'
import { SelectWithSearch } from '../../../../components/select-with-search'

type ProductGeometryOutputSelectProps = {
  title?: string
  productRunId: string | null | undefined
  disabled?: boolean
  placeholder?: string
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
  title,
  productRunId,
  disabled,
  ...props
}: ProductGeometryOutputSelectProps) => {
  const { data: productRun } = useProductRun(productRunId ?? undefined)
  const { data: geometryOutputs, setSearchParams } = useGeometryOutputs(
    productRun?.geometriesRun.id,
  )

  return (
    <FieldGroup
      title={title ?? `Select Geometry${props.multiple ? '(s)' : ''}`}
      disabled={disabled}
    >
      {props.multiple ? (
        <SelectWithSearch
          placeholder={props.placeholder}
          options={geometryOutputs?.data}
          value={props.value ?? []}
          onSelect={props.onSelect}
          onSearch={(value) => {
            setSearchParams({ search: value })
          }}
          disabled={!productRun}
          multiple
        />
      ) : (
        <SelectWithSearch
          placeholder={props.placeholder}
          options={geometryOutputs?.data}
          value={props.value ?? null}
          onSelect={props.onSelect}
          onSearch={(value) => {
            setSearchParams({ search: value })
          }}
          disabled={!productRun}
        />
      )}
    </FieldGroup>
  )
}
