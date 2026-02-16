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
  const errorClass = error ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-primary'

  return (
    <div className={widthClass}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1">
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
          placeholder-gray-400 text-gray-900 
          focus:outline-none focus:ring-2 focus:border-transparent
          disabled:bg-gray-100 disabled:cursor-not-allowed
          ${errorClass} ${className}
        `}
        {...props}
      />
      
      {error && (
        <p className="mt-1 text-sm text-red-600">{error}</p>
      )}
      
      {helperText && !error && (
        <p className="mt-1 text-sm text-gray-500">{helperText}</p>
      )}
    </div>
  )
})

Input.displayName = 'Input'

export default Input
