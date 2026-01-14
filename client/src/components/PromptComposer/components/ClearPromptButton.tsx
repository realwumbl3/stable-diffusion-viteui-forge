import React, { useState } from 'react'
import { cn } from '../../../lib/utils.js'

// Clear prompt button component
interface ClearPromptButtonProps {
  onClear: () => void
  showHint: (text: string) => void
}

function ClearPromptButton({ onClear, showHint }: ClearPromptButtonProps) {
  const [active, setActive] = useState(false)

  const handleClear = () => {
    if (active) {
      onClear()
      setActive(false)
    } else {
      setActive(true)
    }
  }

  const handleCancel = () => setActive(false)

  return (
    <div className={cn('clear-prompt', { active })}>
      <button
        className="button clear"
        onClick={handleClear}
        onMouseEnter={() => showHint("Clear the prompt")}
      >
        Clear
      </button>
      <button
        className="button cancel"
        onClick={handleCancel}
      >
        No
      </button>
      <button
        className="button confirm"
        onClick={() => {
          onClear()
          setActive(false)
        }}
      >
        Yes
      </button>
    </div>
  )
}

export default ClearPromptButton