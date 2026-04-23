import { useCallback, useState } from 'react'

export function useLocalStorage(key, initialValue) {
  const [storedValue, setStoredValue] = useState(() => {
    try {
      const item = localStorage.getItem(key)
      return item ? JSON.parse(item) : initialValue
    } catch {
      return initialValue
    }
  })

  const setValue = useCallback((value) => {
    setStoredValue((prev) => {
      const next = typeof value === 'function' ? value(prev) : value
      localStorage.setItem(key, JSON.stringify(next))
      return next
    })
  }, [key])

  return [storedValue, setValue]
}
