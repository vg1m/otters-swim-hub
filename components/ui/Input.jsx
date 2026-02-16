import { forwardRef } from 'react'

const Input = forwardRef(({ 
  label,
  error,
  helperText,
  type = 'text',
  fullWidth = true,
  disabled = false,
  required = false,
  className = '',
  ...props 
}, ref) => {
  const widthClass = fullWidth ? 'w-full' : ''
  const errorClass = error ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 dark:border-gray-600 focus:ring-primary'

  return (
    <div className={widthClass}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      
      <input
        ref={ref}
        type={type}
        disabled={disabled}
        required={required}
        className={`
          appearance-none block w-full px-3 py-2 
          border rounded-lg 
          placeholder-gray-400 dark:placeholder-gray-500 
          text-gray-900 dark:text-gray-100 
          bg-white dark:bg-gray-700
          focus:outline-none focus:ring-2 focus:border-transparent
          disabled:bg-gray-100 dark:disabled:bg-gray-800 disabled:cursor-not-allowed
          transition-colors duration-200
          ${errorClass} ${className}
        `}
        {...props}
      />
      
      {error && (
        <p className="mt-1 text-sm text-red-600 dark:text-red-400">{error}</p>
      )}
      
      {helperText && !error && (
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{helperText}</p>
      )}
    </div>
  )
})

Input.displayName = 'Input'

export default Input
