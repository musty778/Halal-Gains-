import { createContext, useContext, useState, ReactNode } from 'react'

interface RamadanContextType {
  ramadanMode: boolean
  setRamadanMode: (value: boolean) => void
}

const RamadanContext = createContext<RamadanContextType | undefined>(undefined)

export const RamadanProvider = ({ children }: { children: ReactNode }) => {
  const [ramadanMode, setRamadanMode] = useState(false)

  return (
    <RamadanContext.Provider value={{ ramadanMode, setRamadanMode }}>
      {children}
    </RamadanContext.Provider>
  )
}

export const useRamadan = () => {
  const context = useContext(RamadanContext)
  if (context === undefined) {
    throw new Error('useRamadan must be used within a RamadanProvider')
  }
  return context
}
