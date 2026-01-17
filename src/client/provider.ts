import React, { createContext, useContext, useEffect, useState } from 'react'
import { initializeReactiveClient } from './hooks'
import type { ReactiveConfig } from '../core/types'

interface ReactiveProviderConfig {
  relations: Record<string, string[]>
  organizationId: string
  revalidateFn?: (queryKey: string) => Promise<any>
}

interface ReactiveContextValue {
  organizationId: string
  config: ReactiveConfig
  isInitialized: boolean
}

const ReactiveContext = createContext<ReactiveContextValue | null>(null)

/**
 * React context provider for reactive features
 */
export function ReactiveProvider({
  children,
  config,
}: {
  children: React.ReactNode
  config: ReactiveProviderConfig
}) {
  const [isInitialized, setIsInitialized] = useState(false)
  const { organizationId } = config

  const reactiveConfig: ReactiveConfig = {
    relations: config.relations,
    realtime: {
      enabled: true,
      transport: 'sse' as const,
    },
  }

  // Default revalidation function that returns mock data
  // The ReactiveStorage system handles persistence automatically
  const defaultRevalidateFn = async (queryKey: string) => {
    console.log('🔄 Default revalidating query:', queryKey)

    // Return mock data based on query key
    if (queryKey.includes('agents.getAll')) {
      const mockData = [
        {
          id: '1',
          name: 'Test Agent 1',
          role: 'assistant',
          organizationId: organizationId,
          isActive: true,
          createdAt: new Date().toISOString(),
        },
        {
          id: '2',
          name: 'Test Agent 2',
          role: 'researcher',
          organizationId: organizationId,
          isActive: true,
          createdAt: new Date().toISOString(),
        },
      ]

      // Note: ReactiveStorage will automatically persist this data
      // No need for manual localStorage handling
      console.log(
        '💾 Mock data generated, ReactiveStorage will persist automatically'
      )

      return mockData
    }

    return []
  }

  const revalidateFn = config.revalidateFn || defaultRevalidateFn

  useEffect(() => {
    console.log(
      '🚀 ReactiveProvider: Initializing reactive client for org:',
      organizationId
    )

    try {
      // Initialize the client immediately
      initializeReactiveClient(organizationId, reactiveConfig, revalidateFn)
      setIsInitialized(true)
      console.log(
        '✅ ReactiveProvider: Client initialized successfully for org:',
        organizationId
      )
    } catch (error) {
      console.error('❌ ReactiveProvider: Failed to initialize client:', error)
    }
  }, [organizationId, revalidateFn])

  const contextValue: ReactiveContextValue = {
    organizationId,
    config: reactiveConfig,
    isInitialized,
  }

  // Don't render children until client is initialized
  if (!isInitialized) {
    return React.createElement(
      ReactiveContext.Provider,
      { value: contextValue },
      React.createElement(
        'div',
        { className: 'flex items-center justify-center p-8' },
        React.createElement(
          'div',
          { className: 'text-center' },
          React.createElement('div', {
            className:
              'animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4',
          }),
          React.createElement(
            'p',
            { className: 'text-gray-600' },
            'Initializing reactive client...'
          )
        )
      )
    )
  }

  return React.createElement(
    ReactiveContext.Provider,
    { value: contextValue },
    children
  )
}

/**
 * Hook to access reactive context
 */
export function useReactiveContext() {
  const context = useContext(ReactiveContext)
  if (!context) {
    throw new Error('useReactiveContext must be used within a ReactiveProvider')
  }
  return context
}
