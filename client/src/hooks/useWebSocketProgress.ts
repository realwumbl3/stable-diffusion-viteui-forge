import { useState, useEffect, useRef, useCallback } from 'react'
import api from '../Api.ts'

export interface ProgressData {
  progress?: number
  completed?: boolean
  task_id?: string
  textinfo?: string
  sampling_step?: number
  live_preview?: string | null
  timestamp?: number
  [key: string]: any
}

export interface WebSocketMessage extends ProgressData {
  type?: 'connected' | 'disconnected' | 'ping' | 'pong'
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
    if (this.ws && this.ws.readyState === WebSocket.OPEN && this.currentTaskId !== taskId) {
      this.disconnect()
    }

    // If connecting, wait for current connection to close
    if (this.ws && this.ws.readyState === WebSocket.CONNECTING) {
      return
    }

    this.currentTaskId = taskId
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const wsUrl = `${protocol}//${window.location.host}/internal/progress-ws/${taskId}`

    try {
      this.ws = new WebSocket(wsUrl)

      this.ws.onopen = (): void => {
        console.log('WebSocket connected for progress updates')
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
        console.log('WebSocket disconnected')
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
  const [progress, setProgress] = useState<ProgressData | null>(null)
  const [isConnected, setIsConnected] = useState<boolean>(false)
  const [livePreview, setLivePreview] = useState<string | null>(null)
  const pingIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null)
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

      // Start polling interval as fallback
      pollIntervalRef.current = setInterval(async () => {
        try {
          const progressData = await api.request('/internal/progress', {
            method: 'POST',
            body: JSON.stringify({
              id_task: taskId,
              live_preview: true
            })
          })
          if (progressData && typeof progressData.progress === 'number') {
            // Process the same way as WebSocket messages
            if (completedTasksRef.current.has(taskId)) {
              return
            }
            if (progressData.completed) {
              completedTasksRef.current.add(taskId)
              setProgress(null)
              setLivePreview(null)
              return
            }
            setProgress(progressData)
            if (progressData.live_preview !== undefined) {
              if (progressData.live_preview) {
                setLivePreview(progressData.live_preview)
              } else {
                setLivePreview(null)
              }
            }
          }
        } catch (error) {
          // Ignore polling errors
        }
      }, 2000) // Poll every 2 seconds
    } else {
      // Disconnect if no taskId
      progressManager.disconnect()
      if (pingIntervalRef.current) {
        clearInterval(pingIntervalRef.current)
        pingIntervalRef.current = null
      }
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current)
        pollIntervalRef.current = null
      }
    }

    return () => {
      // Cleanup intervals
      if (pingIntervalRef.current) {
        clearInterval(pingIntervalRef.current)
        pingIntervalRef.current = null
      }
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current)
        pollIntervalRef.current = null
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
    if (!taskId) {
      setProgress(null)
      setLivePreview(null)
    }
  }, [taskId])

  // Handle WebSocket messages
  useEffect(() => {
    const unsubscribe = progressManager.subscribe((data) => {
      // Debug logging with timestamp
      if (data.timestamp) {
        const now = Date.now() / 1000
        const latency = now - data.timestamp
        console.log(`Progress update: ${data.progress?.toFixed(3) || 'N/A'} (${latency.toFixed(3)}s latency)`, data)
      }

      // Handle connection status
      if (data.type === 'connected') {
        setIsConnected(true)
        setLivePreview(null) // Clear any old preview when connecting to new task
        return
      }

      if (data.type === 'disconnected') {
        setIsConnected(false)
        setProgress(null)
        setLivePreview(null)
        return
      }

      // Ignore ping/pong messages - they don't contain progress data
      if (data.type === 'ping' || data.type === 'pong') {
        return
      }

      // Only process messages for the current task
      if (data.task_id && data.task_id !== taskId) {
        return
      }

      // Only process progress updates that have valid progress data
      // Progress updates should have a numeric progress value (0-1)
      if (data.progress !== undefined && typeof data.progress === 'number') {
        // Check if this task has already been completed - if so, ignore further updates
        if (completedTasksRef.current.has(data.task_id)) {
          return
        }

        // Task completed - clear progress and live preview
        if (data.completed) {
          completedTasksRef.current.add(data.task_id)
          setProgress(null)
          setLivePreview(null)
          return
        }

        // Valid progress update
        setProgress(data)

        // Update live preview - handle both presence and absence
        if (data.live_preview !== undefined) {
          if (data.live_preview) {
            setLivePreview(data.live_preview)
          } else {
            // Clear live preview when it's explicitly set to null/empty
            setLivePreview(null)
          }
        }
      }
      // If it's a progress message but doesn't have valid progress data yet,
      // we can still update other fields like textinfo
      else if (data.textinfo || data.sampling_step !== undefined) {
        // Update progress with partial data, preserving existing progress value
        setProgress(prev => ({
          ...prev,
          ...data,
          // Preserve progress if it was valid before
          progress: typeof data.progress === 'number' ? data.progress : (prev?.progress ?? 0)
        }))

        // Also check for live preview in partial updates
        if (data.live_preview) {
          setLivePreview(data.live_preview)
        }
      }
    })

    return unsubscribe
  }, [])

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