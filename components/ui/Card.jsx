export default function Card({ 
  children, 
  title, 
  subtitle,
  footer,
  action,
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
      className={`bg-white dark:bg-gray-800 rounded-lg shadow-custom border border-gray-200 dark:border-gray-700 transition-colors duration-200 ${className}`}
      {...props}
    >
      {(title || subtitle || action) && (
        <div className={`border-b border-gray-200 dark:border-gray-700 ${paddingClasses[padding]}`}>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              {title && (
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{title}</h3>
              )}
              {subtitle && (
                <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">{subtitle}</p>
              )}
            </div>
            {action && (
              <div className="ml-4">
                {action}
              </div>
            )}
          </div>
        </div>
      )}
      
      <div className={paddingClasses[padding]}>
        {children}
      </div>

      {footer && (
        <div className={`border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 rounded-b-lg ${paddingClasses[padding]}`}>
          {footer}
        </div>
      )}
    </div>
  )
}
