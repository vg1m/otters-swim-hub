import { forwardRef } from 'react'

const Select = forwardRef(({ 
  label,
  error,
  helperText,
  options = [],
  fullWidth = true,
  disabled = false,
  required = false,
  placeholder = 'Select an option',
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
      
      <select
        ref={ref}
        disabled={disabled}
        required={required}
        className={`
          appearance-none block w-full px-3 py-2 
          border rounded-lg 
          text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-700
          focus:outline-none focus:ring-2 focus:border-transparent
          disabled:bg-gray-100 dark:disabled:bg-gray-800 disabled:cursor-not-allowed
          transition-colors duration-200
          ${errorClass} ${className}
        `}
        {...props}
      >
        <option value="">{placeholder}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      
      {error && (
        <p className="mt-1 text-sm text-red-600 dark:text-red-400">{error}</p>
      )}
      
      {helperText && !error && (
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{helperText}</p>
      )}
    </div>
  )
})

Select.displayName = 'Select'

export default Select
