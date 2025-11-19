import { ReactNode } from 'react'

interface CardProps {
  children: ReactNode
  title?: string
  className?: string
  padding?: 'sm' | 'md' | 'lg'
  hover?: boolean
}

const Card = ({
  children,
  title,
  className = '',
  padding = 'md',
  hover = false,
}: CardProps) => {
  const paddingStyles = {
    sm: 'p-3',
    md: 'p-6',
    lg: 'p-8',
  }

  const hoverStyle = hover ? 'hover:shadow-xl transition-shadow' : ''

  return (
    <div
      className={`bg-white rounded-lg shadow-md ${paddingStyles[padding]} ${hoverStyle} ${className}`}
    >
      {title && (
        <h3 className="text-xl font-bold mb-4 text-gray-800">{title}</h3>
      )}
      {children}
    </div>
  )
}

export default Card
