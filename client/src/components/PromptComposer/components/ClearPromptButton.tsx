import React, { useState } from 'react'
import { cn } from '../../../lib/utils'

// Clear prompt button component
interface ClearPromptButtonProps {
  onClear: () => void
}

function ClearPromptButton({ onClear }: ClearPromptButtonProps) {
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