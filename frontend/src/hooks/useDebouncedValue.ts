import { useEffect, useState } from 'react'

// Returns `value`, but only updates after it stops changing for `delayMs`.
export const useDebouncedValue = <T,>(value: T, delayMs = 400): T => {
  const [debouncedValue, setDebouncedValue] = useState(value)

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setDebouncedValue(value)
    }, delayMs)

    return () => {
      clearTimeout(timeoutId)
    }
  }, [value, delayMs])

  return debouncedValue
}
