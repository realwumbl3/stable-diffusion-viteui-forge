import { useEffect } from 'react'

export const useKeyboardShortcuts = (shortcuts) => {
  useEffect(() => {
    const handleKeyDown = (event) => {
      const { ctrlKey, metaKey, shiftKey, key } = event
      const isCtrlOrCmd = ctrlKey || metaKey

      // Check for registered shortcuts
      for (const [shortcut, callback] of Object.entries(shortcuts)) {
        const parts = shortcut.toLowerCase().split('+')
        const requiresCtrl = parts.includes('ctrl') || parts.includes('cmd')
        const requiresShift = parts.includes('shift')
        const keyName = parts[parts.length - 1]

        if (
          requiresCtrl === isCtrlOrCmd &&
          requiresShift === shiftKey &&
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