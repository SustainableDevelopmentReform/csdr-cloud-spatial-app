type AuditLogResourceTypeOption = {
  value: string
  label: string
}

export const auditLogResourceTypeOptions: AuditLogResourceTypeOption[] = [
  { value: 'auth', label: 'Auth' },
  { value: 'organization', label: 'Organization' },
  { value: 'member', label: 'Member' },
  { value: 'invitation', label: 'Invitation' },
  { value: 'dataset', label: 'Dataset' },
  { value: 'datasetRun', label: 'Dataset run' },
  { value: 'geometries', label: 'Boundaries' },
  { value: 'geometriesRun', label: 'Boundary run' },
  { value: 'geometryOutput', label: 'Boundary feature' },
  { value: 'product', label: 'Product' },
  { value: 'productRun', label: 'Product run' },
  { value: 'productOutput', label: 'Product output' },
  { value: 'indicatorCategory', label: 'Indicator category' },
  { value: 'indicator', label: 'Indicator' },
  { value: 'derivedIndicator', label: 'Derived indicator' },
  { value: 'report', label: 'Report' },
  { value: 'dashboard', label: 'Dashboard' },
  { value: 'dataLibrary', label: 'Data library' },
  { value: 'auditLog', label: 'Audit log' },
  { value: 'user', label: 'User' },
]

export const formatAuditLogToken = (
  value: string | null | undefined,
): string => {
  if (!value) {
    return 'Unknown'
  }

  return value.replaceAll('_', ' ')
}

export const getAuditLogResourceTypeLabel = (resourceType: string): string => {
  const option = auditLogResourceTypeOptions.find(
    (item) => item.value === resourceType,
  )

  return option?.label ?? formatAuditLogToken(resourceType)
}
