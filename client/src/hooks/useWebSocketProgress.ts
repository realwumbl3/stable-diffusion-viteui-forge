import { useState, useEffect, useRef, useCallback, useReducer } from 'react'
import { API_BASE_URL } from '../lib/utils'

export interface ProgressData {
  progress?: number
  completed?: boolean
  task_id?: string
  textinfo?: string
  sampling_step?: number
  sampling_steps?: number
  live_preview?: string | null
  timestamp?: number
  [key: string]: unknown
}


export interface WebSocketMessage extends ProgressData {
  type?: 'connected' | 'disconnected' | 'ping' | 'pong'
}

interface ProgressState {
  progress: ProgressData | null
  livePreview: string | null
}

type ProgressAction =
  | { type: 'RESET' }
  | { type: 'SET_PROGRESS'; payload: ProgressData | null }
  | { type: 'MERGE_PARTIAL'; payload: Partial<ProgressData> }
  | { type: 'SET_LIVE_PREVIEW'; payload: string | null }

function progressReducer(state: ProgressState, action: ProgressAction): ProgressState {
  switch (action.type) {
    case 'RESET':
      return { progress: null, livePreview: null }
    case 'SET_PROGRESS':
      return { ...state, progress: action.payload }
    case 'MERGE_PARTIAL': {
      const previousProgress: ProgressData = state.progress ?? {}
      return {
        ...state,
        progress: {
          ...previousProgress,
          ...action.payload,
          progress:
            typeof action.payload.progress === 'number'
              ? action.payload.progress
              : previousProgress.progress ?? 0,
        },
      }
    }
    case 'SET_LIVE_PREVIEW':
      return { ...state, livePreview: action.payload }
    default:
      return state
  }
}

export class ProgressWebSocketManager {
  ws: WebSocket | null = null
  reconnectAttempts: number = 0
  maxReconnectAttempts: number = 5
  listeners: Set<(data: WebSocketMessage) => void> = new Set()
  currentTaskId: string | null = null

  constructor() {
    // Constructor is now empty - initialization moved to property declarations
  }

  connect(taskId: string | null = null): void {
    // If no taskId, disconnect
    if (!taskId) {
      this.disconnect()
      return
    }

    // If already connected with the same taskId, don't reconnect
    if (this.ws && this.ws.readyState === WebSocket.OPEN && this.currentTaskId === taskId) {
      return
    }

    // If connected with different taskId, disconnect first
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING) && this.currentTaskId !== taskId) {
      this.disconnect()
    }

    // If connecting to a different taskId, wait for current connection to close
    if (this.ws && this.ws.readyState === WebSocket.CONNECTING && this.currentTaskId === taskId) {
      return
    }

    this.currentTaskId = taskId

    // Parse API base URL to construct WebSocket URL
    const apiUrl = new URL(API_BASE_URL)
    const protocol = apiUrl.protocol === 'https:' ? 'wss:' : 'ws:'
    const encodedTaskId = encodeURIComponent(taskId)
    const wsUrl = `${protocol}//${apiUrl.host}/internal/progress-ws?task_id=${encodedTaskId}`

    try {
      this.ws = new WebSocket(wsUrl)

      this.ws.onopen = (): void => {
        this.reconnectAttempts = 0
        this.broadcast({ type: 'connected' })
      }

      this.ws.onmessage = (event: MessageEvent): void => {
        try {
          const data: WebSocketMessage = JSON.parse(event.data)
          this.broadcast(data)
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error)
        }
      }

      this.ws.onclose = (event: CloseEvent): void => {
        console.log('WebSocket disconnected, code:', event.code, 'reason:', event.reason, 'wasClean:', event.wasClean)
        this.broadcast({ type: 'disconnected' })

        // Attempt to reconnect if not intentionally closed
        if (event.code !== 1000 && this.reconnectAttempts < this.maxReconnectAttempts) {
          this.reconnectAttempts++
          setTimeout(() => {
            console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`)
            this.connect(this.currentTaskId)
          }, 1000 * this.reconnectAttempts)
        }
      }

      this.ws.onerror = (error: Event): void => {
        console.error('WebSocket error:', error)
        console.error('WebSocket readyState:', this.ws?.readyState)
        console.error('WebSocket URL:', this.ws?.url)
      }

    } catch (error) {
      console.error('Failed to create WebSocket connection:', error)
    }
  }

  disconnect(): void {
    if (this.ws) {
      // Remove event handlers to prevent reconnection attempts
      this.ws.onclose = null
      this.ws.onerror = null
      this.ws.close(1000, 'Client disconnecting')
      this.ws = null
      this.currentTaskId = null
      this.reconnectAttempts = 0
    } else {
      // Ensure taskId is cleared even if no WebSocket exists
      this.currentTaskId = null
      this.reconnectAttempts = 0
    }
  }

  subscribe(listener: (data: WebSocketMessage) => void): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  broadcast(data: WebSocketMessage): void {
    this.listeners.forEach(listener => {
      try {
        listener(data)
      } catch (error) {
        console.error('Error in progress listener:', error)
      }
    })
  }

  ping(): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: 'ping' }))
    }
  }
}

// Global WebSocket manager instance
const progressManager = new ProgressWebSocketManager()

export interface UseWebSocketProgressReturn {
  progress: ProgressData | null
  isConnected: boolean
  livePreview: string | null
  disconnect: () => void
}

export const useWebSocketProgress = (taskId: string | null = null): UseWebSocketProgressReturn => {
  const [progressState, dispatchProgressState] = useReducer(progressReducer, {
    progress: null,
    livePreview: null,
  })
  const { progress, livePreview } = progressState
  const [isConnected, setIsConnected] = useState<boolean>(false)
  const pingIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const completedTasksRef = useRef<Set<string>>(new Set())

  // Handle connection and ping interval
  useEffect(() => {
    // Only connect when we have a taskId
    if (taskId) {
      progressManager.connect(taskId)

      // Start ping interval to keep connection alive
      pingIntervalRef.current = setInterval(() => {
        progressManager.ping()
      }, 30000) // Every 30 seconds
    } else {
      // Disconnect if no taskId
      progressManager.disconnect()
      if (pingIntervalRef.current) {
        clearInterval(pingIntervalRef.current)
        pingIntervalRef.current = null
      }
    }

    return () => {
      // Cleanup intervals
      if (pingIntervalRef.current) {
        clearInterval(pingIntervalRef.current)
        pingIntervalRef.current = null
      }
      // Note: We don't disconnect here because the manager is shared
      // The manager will handle reconnection when taskId changes
    }
  }, [taskId])

  // Reset completed tasks when taskId changes
  useEffect(() => {
    completedTasksRef.current.clear()
  }, [taskId])

  // Clear progress and live preview when task ends
  useEffect(() => {
    console.log('Task ID changed:', taskId)
    if (!taskId) {
      console.log('Clearing progress and live preview')
      dispatchProgressState({ type: 'RESET' })
    }
  }, [taskId])

  // Handle WebSocket messages
  useEffect(() => {
    const unsubscribe = progressManager.subscribe((data) => {
      // Handle connection status
      if (data.type === 'connected') {
        setIsConnected(true)
        dispatchProgressState({ type: 'SET_LIVE_PREVIEW', payload: null }) // Clear any old preview when connecting to new task
        return
      }

      if (data.type === 'disconnected') {
        setIsConnected(false)
        dispatchProgressState({ type: 'RESET' })
        return
      }

      // Ignore ping/pong messages - they don't contain progress data
      if (data.type === 'ping' || data.type === 'pong') {
        return
      }

      // Only process messages for the current task, unless it's a completion message for a completed task
      if (data.task_id && data.task_id !== taskId && !(data.completed && completedTasksRef.current.has(data.task_id))) {
        return
      }

      // Only process progress updates that have valid progress data
      // Progress updates should have a numeric progress value (0-1)
      if (data.progress !== undefined && typeof data.progress === 'number') {
        // console.log('WebSocket: Received progress update', data.progress, data.task_id)
        
        // Check if this task has already been completed - if so, ignore further updates
        if (data.task_id && completedTasksRef.current.has(data.task_id)) {
          console.log('WebSocket: Ignoring update for completed task', data.task_id)
          return
        }

        // Task completed - clear progress and live preview
        if (data.completed && data.task_id) {
          console.log('WebSocket: Task completed', data.task_id, 'progress:', data.progress)
          completedTasksRef.current.add(data.task_id)
          dispatchProgressState({ type: 'RESET' })
          return
        }

        if (data.total_batches && (data.total_batches as number) > 1) {
          console.log('WebSocket: Multi-batch update', {
            progress: data.progress,
            batch: `${data.current_batch}/${data.total_batches}`,
            step: `${data.sampling_step}/${data.sampling_steps}`,
            task_id: data.task_id
          })
        }

        // Valid progress update
        dispatchProgressState({ type: 'SET_PROGRESS', payload: data })

        // Update live preview - handle both presence and absence
        if (data.live_preview !== undefined) {
          dispatchProgressState({
            type: 'SET_LIVE_PREVIEW',
            payload: data.live_preview ? data.live_preview : null,
          })
        }
      }
      // If it's a progress message but doesn't have valid progress data yet,
      // we can still update other fields like textinfo
      else if (data.textinfo || data.sampling_step !== undefined) {
        dispatchProgressState({ type: 'MERGE_PARTIAL', payload: data })

        // Also check for live preview in partial updates
        if (data.live_preview !== undefined) {
          dispatchProgressState({
            type: 'SET_LIVE_PREVIEW',
            payload: data.live_preview ? data.live_preview : null,
          })
        }
      }
    })

    return unsubscribe
  }, [taskId])

  const disconnect = useCallback(() => {
    progressManager.disconnect()
  }, [])

  return {
    progress,
    isConnected,
    livePreview,
    disconnect
  }
}

export default useWebSocketProgress