type DateInput = number | string | Date | undefined | null

const dateFormatter = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
})

const timeFormatter = new Intl.DateTimeFormat('en-US', {
  hour: 'numeric',
  minute: '2-digit',
})

const isSameLocalDay = (date: Date, comparisonDate: Date) =>
  date.getFullYear() === comparisonDate.getFullYear() &&
  date.getMonth() === comparisonDate.getMonth() &&
  date.getDate() === comparisonDate.getDate()

export const formatDate = (date: DateInput) => {
  if (!date) return ''
  return dateFormatter.format(new Date(date))
}

export const formatDateTime = (date: DateInput) => {
  if (!date) return ''
  const localDate = new Date(date)
  return isSameLocalDay(localDate, new Date())
    ? timeFormatter.format(localDate)
    : dateFormatter.format(localDate)
}
