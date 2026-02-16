export default function Card({ 
  children, 
  title, 
  subtitle,
  footer,
  padding = 'normal',
  className = '',
  ...props 
}) {
  const paddingClasses = {
    none: '',
    sm: 'p-4',
    normal: 'p-6',
    lg: 'p-8',
  }

  return (
    <div 
      className={`bg-white rounded-lg shadow-custom border border-gray-200 ${className}`}
      {...props}
    >
      {(title || subtitle) && (
        <div className={`border-b border-gray-200 ${paddingClasses[padding]}`}>
          {title && (
            <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          )}
          {subtitle && (
            <p className="mt-1 text-sm text-gray-600">{subtitle}</p>
          )}
        </div>
      )}
      
      <div className={paddingClasses[padding]}>
        {children}
      </div>

      {footer && (
        <div className={`border-t border-gray-200 bg-gray-50 rounded-b-lg ${paddingClasses[padding]}`}>
          {footer}
        </div>
      )}
    </div>
  )
}
