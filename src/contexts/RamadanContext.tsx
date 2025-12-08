import { createContext, useContext, useState, useMemo, ReactNode } from 'react'

interface RamadanContextType {
  ramadanMode: boolean
  setRamadanMode: (value: boolean) => void
}

const RamadanContext = createContext<RamadanContextType>({
  ramadanMode: false,
  setRamadanMode: () => {}
})

export function RamadanProvider({ children }: { children: ReactNode }) {
  const [ramadanMode, setRamadanMode] = useState(false)

  const value = useMemo(
    () => ({ ramadanMode, setRamadanMode }),
    [ramadanMode]
  )

  return (
    <RamadanContext.Provider value={value}>
      {children}
    </RamadanContext.Provider>
  )
}

export function useRamadan() {
  return useContext(RamadanContext)
}
