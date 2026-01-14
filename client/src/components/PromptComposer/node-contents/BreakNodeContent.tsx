import React from 'react'
import type { BreakNode } from '../types'

// Break Node Content
interface BreakNodeContentProps {
  node: BreakNode
  onUpdate: (updates: Partial<BreakNode>) => void
}

function BreakNodeContent({
  node,
  onUpdate
}: BreakNodeContentProps) {
  const handleChange = (value: BreakNode['value']) => {
    onUpdate({ value })
  }

  return (
    <form className="options" onChange={(e) => handleChange((e.target as HTMLInputElement).value as BreakNode['value'])}>
      <label>
        <input type="radio" name="break-type" value="break" defaultChecked={node.value === 'break'} />
        Break
      </label>
      <label>
        <input type="radio" name="break-type" value="addcomm" defaultChecked={node.value === 'addcomm'} />
        Common
      </label>
      <label>
        <input type="radio" name="break-type" value="addrow" defaultChecked={node.value === 'addrow'} />
        Row
      </label>
      <label>
        <input type="radio" name="break-type" value="addcol" defaultChecked={node.value === 'addcol'} />
        Col
      </label>
    </form>
  )
}

export default BreakNodeContent