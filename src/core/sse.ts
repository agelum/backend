/**
 * Server-Sent Events implementation for real-time cache invalidation
 * Perfect for unidirectional communication with automatic reconnection
 */

import type { InvalidationEvent } from './types.js'

export interface SSEConnection {
  organizationId: string
  controller: ReadableStreamDefaultController
  lastActivity: number // Changed from lastHeartbeat to lastActivity
  isActive: boolean
}

export interface PendingEvent {
  id: string
  organizationId: string
  data: InvalidationEvent
  timestamp: number
  delivered: boolean
  retryCount: number
  maxRetries: number
}

/**
 * SSE Manager for reliable real-time communication
 * NO HEARTBEATS - uses event acknowledgments and connection monitoring instead
 */
export class SSEManager {
  private connections = new Map<string, Set<SSEConnection>>()
  private pendingEvents = new Map<string, PendingEvent>()
  private retrySchedule = [2000, 5000, 10000] // 2s, 5s, 10s
  private connectionMonitorInterval: NodeJS.Timeout | null = null

  constructor() {
    this.startConnectionMonitor()
  }

  /**
   * Create SSE stream for an organization
   */
  createSSEStream(organizationId: string): Response {
    const encoder = new TextEncoder()

    const stream = new ReadableStream({
      start: (controller: ReadableStreamDefaultController) => {
        const connection: SSEConnection = {
          organizationId,
          controller,
          lastActivity: Date.now(), // Track last activity instead of heartbeat
          isActive: true,
        }

        // Register connection
        this.addConnection(organizationId, connection)

        // Send initial connection event
        this.sendEvent(controller, {
          type: 'connected',
          organizationId,
          timestamp: Date.now(),
        })

        console.log(`[SSE] New connection for org: ${organizationId}`)

        // Cleanup on disconnect
        return () => {
          console.log(`[SSE] Connection closed for org: ${organizationId}`)
          connection.isActive = false
          this.removeConnection(organizationId, connection)
        }
      },

      cancel: () => {
        console.log(`[SSE] Stream cancelled for org: ${organizationId}`)
      },
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Cache-Control',
      },
    })
  }

  /**
   * Broadcast invalidation event to all connections in an organization
   */
  async broadcastInvalidation(
    organizationId: string,
    invalidationData: Omit<InvalidationEvent, 'eventId' | 'requiresAck'>
  ): Promise<void> {
    const eventId = this.generateEventId()
    const event: InvalidationEvent = {
      ...invalidationData,
      eventId,
      requiresAck: true,
    }

    console.log(
      `🔥 [SSE-BROADCAST] Broadcasting invalidation for org: ${organizationId}, table: ${event.table}, operation: ${event.operation}, eventId: ${eventId}`
    )
    console.log('🔥 [SSE-BROADCAST] Event details:', {
      table: event.table,
      operation: event.operation,
      affectedQueries: event.affectedQueries,
      affectedKeys: event.affectedKeys,
    })

    // Store for potential retry
    const pendingEvent: PendingEvent = {
      id: eventId,
      organizationId,
      data: event,
      timestamp: Date.now(),
      delivered: false,
      retryCount: 0,
      maxRetries: 3,
    }

    this.pendingEvents.set(eventId, pendingEvent)

    // Send to all connections
    const connections = this.connections.get(organizationId)
    if (connections && connections.size > 0) {
      let successCount = 0
      let failCount = 0

      for (const connection of connections) {
        if (connection.isActive) {
          try {
            this.sendEvent(connection.controller, event)
            // Update last activity when we successfully send an event
            connection.lastActivity = Date.now()
            successCount++
          } catch (error) {
            console.warn(`[SSE] Failed to send to connection:`, error)
            connection.isActive = false
            failCount++
          }
        }
      }

      console.log(
        `[SSE] Broadcast complete: ${successCount} sent, ${failCount} failed`
      )

      // If no successful sends, schedule retry
      if (successCount === 0) {
        this.scheduleRetryIfNeeded(eventId)
      }
    } else {
      console.log(`[SSE] No active connections for org: ${organizationId}`)
      // Still schedule retry in case connections come back
      this.scheduleRetryIfNeeded(eventId)
    }
  }

  /**
   * Acknowledge event receipt (called by client)
   */
  acknowledgeEvent(eventId: string): void {
    const event = this.pendingEvents.get(eventId)
    if (event) {
      event.delivered = true
      this.pendingEvents.delete(eventId)
      console.log(`[SSE] Event acknowledged: ${eventId}`)
    }
  }

  /**
   * Get connection statistics
   */
  getConnectionStats(): {
    totalConnections: number
    connectionsByOrg: Record<string, number>
    pendingEvents: number
    activeEvents: PendingEvent[]
  } {
    const connectionsByOrg: Record<string, number> = {}
    let totalConnections = 0

    for (const [orgId, connections] of this.connections) {
      const activeConnections = Array.from(connections).filter(
        (conn) => conn.isActive
      ).length
      connectionsByOrg[orgId] = activeConnections
      totalConnections += activeConnections
    }

    return {
      totalConnections,
      connectionsByOrg,
      pendingEvents: this.pendingEvents.size,
      activeEvents: Array.from(this.pendingEvents.values()).filter(
        (event) => !event.delivered
      ),
    }
  }

  /**
   * Send event to a specific connection
   */
  private sendEvent(
    controller: ReadableStreamDefaultController,
    data: any
  ): void {
    try {
      const encoder = new TextEncoder()
      const eventData = `data: ${JSON.stringify(data)}\n\n`
      controller.enqueue(encoder.encode(eventData))
    } catch (error) {
      console.warn('[SSE] Failed to send event:', error)
      throw error
    }
  }

  /**
   * Add connection to organization
   */
  private addConnection(
    organizationId: string,
    connection: SSEConnection
  ): void {
    if (!this.connections.has(organizationId)) {
      this.connections.set(organizationId, new Set())
    }
    this.connections.get(organizationId)!.add(connection)
  }

  /**
   * Remove connection from organization
   */
  private removeConnection(
    organizationId: string,
    connection: SSEConnection
  ): void {
    const connections = this.connections.get(organizationId)
    if (connections) {
      connections.delete(connection)
      if (connections.size === 0) {
        this.connections.delete(organizationId)
      }
    }
  }

  /**
   * Schedule retry for unacknowledged events
   */
  private scheduleRetryIfNeeded(eventId: string): void {
    const event = this.pendingEvents.get(eventId)
    if (!event || event.delivered) return

    const delay = this.retrySchedule[event.retryCount] || 10000

    setTimeout(async () => {
      const currentEvent = this.pendingEvents.get(eventId)
      if (!currentEvent || currentEvent.delivered) return

      if (currentEvent.retryCount < currentEvent.maxRetries) {
        currentEvent.retryCount++
        console.log(
          `[SSE] Retrying event ${eventId} (attempt ${currentEvent.retryCount})`
        )

        // Retry broadcast
        const connections = this.connections.get(currentEvent.organizationId)
        if (connections && connections.size > 0) {
          for (const connection of connections) {
            if (connection.isActive) {
              try {
                this.sendEvent(connection.controller, {
                  ...currentEvent.data,
                  retry: currentEvent.retryCount,
                })
                // Update last activity on successful retry
                connection.lastActivity = Date.now()
              } catch (error) {
                connection.isActive = false
              }
            }
          }
        }

        this.scheduleRetryIfNeeded(eventId)
      } else {
        console.warn(
          `[SSE] Event ${eventId} failed after ${currentEvent.maxRetries} retries`
        )
        this.pendingEvents.delete(eventId)
      }
    }, delay)
  }

  /**
   * Monitor connections for health without sending heartbeats
   * Uses activity tracking and error detection instead of periodic messages
   */
  private startConnectionMonitor(): void {
    this.connectionMonitorInterval = setInterval(() => {
      const now = Date.now()
      const maxInactivity = 120000 // 2 minutes of inactivity

      for (const [orgId, connections] of this.connections) {
        for (const connection of connections) {
          // Mark connections as inactive if they haven't had activity in 2 minutes
          if (connection.isActive && now - connection.lastActivity > maxInactivity) {
            console.log(
              `[SSE] Marking inactive connection as closed for org: ${orgId}`
            )
            connection.isActive = false
          }
        }

        // Remove inactive connections
        const activeConnections = Array.from(connections).filter(
          (conn) => conn.isActive
        )
        if (activeConnections.length !== connections.size) {
          this.connections.set(orgId, new Set(activeConnections))
          if (activeConnections.length === 0) {
            this.connections.delete(orgId)
          }
        }
      }

      // Clean up old pending events (older than 5 minutes)
      const maxEventAge = 300000 // 5 minutes
      for (const [eventId, event] of this.pendingEvents) {
        if (now - event.timestamp > maxEventAge) {
          console.log(`[SSE] Cleaning up old pending event: ${eventId}`)
          this.pendingEvents.delete(eventId)
        }
      }
    }, 60000) // Check every minute instead of every 30 seconds
  }

  /**
   * Generate unique event ID
   */
  private generateEventId(): string {
    return `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  /**
   * Cleanup resources
   */
  cleanup(): void {
    if (this.connectionMonitorInterval) {
      clearInterval(this.connectionMonitorInterval)
    }

    // Close all connections
    for (const [, connections] of this.connections) {
      for (const connection of connections) {
        if (connection.isActive) {
          try {
            connection.controller.close()
          } catch (error) {
            // Ignore close errors
          }
        }
      }
    }

    this.connections.clear()
    this.pendingEvents.clear()
  }
}

// Global SSE manager instance
let globalSSEManager: SSEManager | null = null

/**
 * Get or create global SSE manager
 */
export function getSSEManager(): SSEManager {
  if (!globalSSEManager) {
    globalSSEManager = new SSEManager()
  }
  return globalSSEManager
}

/**
 * Create SSE stream for Vercel/Next.js API routes
 */
export function createSSEStream(organizationId: string): Response {
  const manager = getSSEManager()
  return manager.createSSEStream(organizationId)
}

/**
 * Broadcast invalidation event
 */
export async function broadcastInvalidation(
  organizationId: string,
  invalidationData: Omit<InvalidationEvent, 'eventId' | 'requiresAck'>
): Promise<void> {
  const manager = getSSEManager()
  await manager.broadcastInvalidation(organizationId, invalidationData)
}

/**
 * Acknowledge event (for API route)
 */
export function acknowledgeEvent(eventId: string): void {
  const manager = getSSEManager()
  manager.acknowledgeEvent(eventId)
}
