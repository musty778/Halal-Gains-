import * as React from 'react'

interface RamadanContextType {
  ramadanMode: boolean
  setRamadanMode: (value: boolean) => void
}

const RamadanContext = React.createContext<RamadanContextType>({
  ramadanMode: false,
  setRamadanMode: () => {}
})

export function RamadanProvider({ children }: { children: React.ReactNode }) {
  const [ramadanMode, setRamadanMode] = React.useState(false)

  const value = React.useMemo(
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
  return React.useContext(RamadanContext)
}
