/**
 * Password validation utility
 * Enforces strong password requirements
 */

export function validatePassword(password) {
  const minLength = 10
  const errors = []

  // Check minimum length
  if (password.length < minLength) {
    errors.push(`Password must be at least ${minLength} characters long`)
  }

  // Check for uppercase letter
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter')
  }

  // Check for lowercase letter
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter')
  }

  // Check for number
  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number')
  }

  // Check for special character
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    errors.push('Password must contain at least one special character (!@#$%^&* etc.)')
  }

  return {
    isValid: errors.length === 0,
    errors
  }
}

export function getPasswordStrength(password) {
  let strength = 0
  
  if (password.length >= 10) strength++
  if (password.length >= 14) strength++
  if (/[a-z]/.test(password)) strength++
  if (/[A-Z]/.test(password)) strength++
  if (/[0-9]/.test(password)) strength++
  if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) strength++
  
  if (strength <= 2) return { label: 'Weak', color: 'red', width: '33%' }
  if (strength <= 4) return { label: 'Medium', color: 'yellow', width: '66%' }
  return { label: 'Strong', color: 'green', width: '100%' }
}
