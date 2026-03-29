'use client'

import { useState, useRef, useEffect, useLayoutEffect } from 'react'
import { createPortal } from 'react-dom'

export default function DropdownMenu({ trigger, children, align = 'right' }) {
  const [isOpen, setIsOpen] = useState(false)
  const [pos, setPos] = useState({ top: 0, left: 0 })
  const triggerWrapRef = useRef(null)
  const menuRef = useRef(null)

  const updatePosition = () => {
    const el = triggerWrapRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const menuWidth = 200
    let left = align === 'right' ? rect.right - menuWidth : rect.left
    left = Math.max(8, Math.min(left, window.innerWidth - menuWidth - 8))
    const top = Math.min(rect.bottom + 8, window.innerHeight - 8)
    setPos({ top, left })
  }

  useLayoutEffect(() => {
    if (!isOpen) return
    updatePosition()
    window.addEventListener('scroll', updatePosition, true)
    window.addEventListener('resize', updatePosition)
    return () => {
      window.removeEventListener('scroll', updatePosition, true)
      window.removeEventListener('resize', updatePosition)
    }
  }, [isOpen, align])

  useEffect(() => {
    function handleClickOutside(event) {
      if (triggerWrapRef.current?.contains(event.target)) return
      if (menuRef.current?.contains(event.target)) return
      setIsOpen(false)
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) return
    function onKey(e) {
      if (e.key === 'Escape') setIsOpen(false)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [isOpen])

  const menu = isOpen && (
    <div
      ref={menuRef}
      className="fixed z-[100] min-w-[160px] bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1"
      style={{ top: pos.top, left: pos.left }}
      role="menu"
    >
      {children}
    </div>
  )

  return (
    <div className="relative inline-block" ref={triggerWrapRef}>
      <div onClick={() => setIsOpen((o) => !o)}>{trigger}</div>
      {typeof document !== 'undefined' && menu && createPortal(menu, document.body)}
    </div>
  )
}

export function DropdownMenuItem({ onClick, children, variant = 'default' }) {
  const variants = {
    default: 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700',
    danger: 'text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20',
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full text-left px-4 py-2 text-sm transition-colors ${variants[variant]}`}
    >
      {children}
    </button>
  )
}
