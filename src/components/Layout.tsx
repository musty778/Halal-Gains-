import { ReactNode } from 'react'
import Sidebar from './Sidebar'

interface LayoutProps {
  children: ReactNode
}

const Layout = ({ children }: LayoutProps) => {
  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar />
      {/* Main content area with left margin for sidebar on desktop, top padding for mobile header */}
      <div className="lg:ml-64 pt-16 lg:pt-0">
        <main className="min-h-screen">
          {children}
        </main>
      </div>
    </div>
  )
}

export default Layout
