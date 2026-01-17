/**
 * Client-side SSE client for real-time cache invalidation
 * NO HEARTBEATS - relies on event acknowledgments and connection health
 */

import type { InvalidationEvent } from '../core/types'

export interface SSEClientOptions {
  url: string
  onInvalidation: (event: InvalidationEvent) => void
  onError: (error: Error) => void
  onReconnect?: () => void
  maxReconnectAttempts?: number
  reconnectDelay?: number
  // Removed heartbeatTimeout - no heartbeats needed
}

export interface SSEClientStats {
  connectionAttempts: number
  successfulConnections: number
  failedConnections: number
  reconnectAttempts: number
  eventsReceived: number
  eventsAcknowledged: number
  lastEventTime: number
  connectionStartTime?: number
  totalUptime: number
}

/**
 * SSE Client for real-time cache invalidation
 * Uses event acknowledgments instead of heartbeats for reliability
 */
export class SSEClient {
  private eventSource: EventSource | null = null
  private reconnectTimer: NodeJS.Timeout | null = null
  private isIntentionallyClosed = false
  private stats: SSEClientStats
  private options: Required<SSEClientOptions>

  constructor(options: SSEClientOptions) {
    this.options = {
      maxReconnectAttempts: 5,
      reconnectDelay: 1000,
      onReconnect: () => {},
      ...options,
    }

    this.stats = {
      connectionAttempts: 0,
      successfulConnections: 0,
      failedConnections: 0,
      reconnectAttempts: 0,
      eventsReceived: 0,
      eventsAcknowledged: 0,
      lastEventTime: 0,
      totalUptime: 0,
    }
  }

  /**
   * Connect to SSE stream
   */
  connect(): void {
    if (this.eventSource) {
      this.disconnect()
    }

    this.stats.connectionAttempts++
    this.stats.connectionStartTime = Date.now()

    try {
      this.eventSource = new EventSource(this.options.url)

      this.eventSource.onopen = () => {
        this.stats.successfulConnections++
        console.log('[SSEClient] Connection opened')
      }

      this.eventSource.onmessage = (event) => {
        this.handleMessage(event)
      }

      this.eventSource.onerror = (error) => {
        this.stats.failedConnections++
        console.warn('[SSEClient] Connection error:', error)
        this.handleConnectionError()
      }
    } catch (error) {
      this.stats.failedConnections++
      console.error('[SSEClient] Failed to create connection:', error)
      this.handleConnectionError()
    }
  }

  /**
   * Disconnect from SSE stream
   */
  disconnect(): void {
    this.isIntentionallyClosed = true
    this.clearReconnectTimer()

    if (this.eventSource) {
      this.eventSource.close()
      this.eventSource = null
    }

    // Update uptime stats
    if (this.stats.connectionStartTime) {
      this.stats.totalUptime += Date.now() - this.stats.connectionStartTime
      this.stats.connectionStartTime = undefined
    }

    console.log('[SSEClient] Connection closed')
  }

  /**
   * Handle incoming SSE messages
   */
  private handleMessage(event: MessageEvent): void {
    this.stats.lastEventTime = Date.now()
    this.stats.eventsReceived++

    try {
      const data = JSON.parse(event.data)

      switch (data.type) {
        case 'connected':
          console.log('[SSEClient] Connection confirmed')
          break

        // Removed heartbeat case - no heartbeats sent by server

        case 'invalidation':
          console.log(
            `[SSEClient] Invalidation received for table: ${data.table}`
          )
          this.handleInvalidationEvent(data as InvalidationEvent)
          break

        default:
          console.log('[SSEClient] Unknown event type:', data.type)
      }
    } catch (error) {
      console.warn('[SSEClient] Failed to parse event data:', error)
      this.options.onError(error as Error)
    }
  }

  /**
   * Handle invalidation events
   */
  private handleInvalidationEvent(event: InvalidationEvent): void {
    // Notify the invalidation handler
    this.options.onInvalidation(event)

    // Send acknowledgment if required
    if (event.requiresAck && event.eventId) {
      this.acknowledgeEvent(event.eventId)
    }
  }

  /**
   * Send event acknowledgment to server
   */
  private async acknowledgeEvent(eventId: string): Promise<void> {
    try {
      const response = await fetch('/api/events/ack', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ eventId }),
      })

      if (response.ok) {
        this.stats.eventsAcknowledged++
        console.log(`[SSEClient] Event acknowledged: ${eventId}`)
      } else {
        console.warn(`[SSEClient] Failed to acknowledge event: ${eventId}`)
      }
    } catch (error) {
      console.warn(`[SSEClient] Acknowledgment failed: ${eventId}`, error)
      // Silent fail - server will retry if needed
    }
  }

  /**
   * Schedule reconnection attempt
   */
  private scheduleReconnect(): void {
    if (this.isIntentionallyClosed) return

    if (this.stats.reconnectAttempts >= this.options.maxReconnectAttempts) {
      console.error(
        `[SSEClient] Max reconnect attempts (${this.options.maxReconnectAttempts}) reached`
      )
      this.options.onError(new Error('Max reconnection attempts exceeded'))
      return
    }

    this.clearReconnectTimer()

    const delay = Math.min(
      this.options.reconnectDelay * Math.pow(2, this.stats.reconnectAttempts),
      30000 // Max 30 seconds
    )

    console.log(
      `[SSEClient] Scheduling reconnect in ${delay}ms (attempt ${
        this.stats.reconnectAttempts + 1
      })`
    )

    this.reconnectTimer = setTimeout(() => {
      this.stats.reconnectAttempts++
      this.connect()
    }, delay)
  }

  /**
   * Handle connection errors and schedule reconnection
   */
  private handleConnectionError(): void {
    if (this.eventSource) {
      this.eventSource.close()
      this.eventSource = null
    }

    // Update uptime stats
    if (this.stats.connectionStartTime) {
      this.stats.totalUptime += Date.now() - this.stats.connectionStartTime
      this.stats.connectionStartTime = undefined
    }

    // Schedule reconnection
    this.scheduleReconnect()
  }

  /**
   * Clear reconnection timer
   */
  private clearReconnectTimer(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }
  }

  /**
   * Get connection statistics
   */
  getStats(): SSEClientStats {
    return { ...this.stats }
  }

  /**
   * Check if currently connected
   */
  isConnected(): boolean {
    return this.eventSource?.readyState === EventSource.OPEN
  }

  /**
   * Get connection state
   */
  getConnectionState(): 'connecting' | 'open' | 'closed' {
    if (!this.eventSource) return 'closed'

    switch (this.eventSource.readyState) {
      case EventSource.CONNECTING:
        return 'connecting'
      case EventSource.OPEN:
        return 'open'
      case EventSource.CLOSED:
        return 'closed'
      default:
        return 'closed'
    }
  }
}
