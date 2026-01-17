import { useEffect } from 'react'

export type KeyboardShortcutCallback = () => void

export type KeyboardShortcuts = Record<string, KeyboardShortcutCallback>

export const useKeyboardShortcuts = (shortcuts: KeyboardShortcuts): void => {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent): void => {
      const { ctrlKey, metaKey, shiftKey, altKey, key } = event
      const isCtrlOrCmd = ctrlKey || metaKey

      // Check for registered shortcuts
      for (const [shortcut, callback] of Object.entries(shortcuts)) {
        const parts = shortcut.toLowerCase().split('+')
        const requiresCtrl = parts.includes('ctrl') || parts.includes('cmd')
        const requiresShift = parts.includes('shift')
        const requiresAlt = parts.includes('alt')
        const keyName = parts[parts.length - 1]

        if (
          requiresCtrl === isCtrlOrCmd &&
          requiresShift === shiftKey &&
          requiresAlt === altKey &&
          key.toLowerCase() === keyName
        ) {
          event.preventDefault()
          callback()
          break
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [shortcuts])
}