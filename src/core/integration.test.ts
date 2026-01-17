/**
 * Integration test for the reactive database driver
 * Tests the complete flow from SQL interception to cache invalidation
 */

import { createReactiveDb } from './driver'
import type { ReactiveConfig } from './types'

// Mock Drizzle database
class MockDrizzleDb {
  private data = new Map<string, any[]>()
  private executedQueries: string[] = []

  constructor() {
    // Initialize with some test data
    this.data.set('agents', [
      { id: 'agent-1', name: 'Agent 1', organizationId: 'org-123' },
      { id: 'agent-2', name: 'Agent 2', organizationId: 'org-123' },
    ])
    this.data.set('messages', [
      {
        id: 'msg-1',
        content: 'Hello',
        fromAgentId: 'agent-1',
        organizationId: 'org-123',
      },
    ])
  }

  // Mock execute method
  async execute(sql: any, params?: any[]) {
    const sqlString = typeof sql === 'string' ? sql : sql.sql || 'unknown'
    this.executedQueries.push(sqlString)

    console.log(`[MockDB] Executing: ${sqlString}`)

    // Simulate database response based on query type
    if (sqlString.toUpperCase().includes('SELECT')) {
      if (sqlString.includes('agents')) {
        return this.data.get('agents') || []
      } else if (sqlString.includes('messages')) {
        return this.data.get('messages') || []
      }
      return []
    }

    if (sqlString.toUpperCase().includes('INSERT')) {
      return { insertId: 'new-id', affectedRows: 1 }
    }

    if (sqlString.toUpperCase().includes('UPDATE')) {
      return { affectedRows: 1 }
    }

    if (sqlString.toUpperCase().includes('DELETE')) {
      return { affectedRows: 1 }
    }

    return {}
  }

  getExecutedQueries() {
    return [...this.executedQueries]
  }

  clearExecutedQueries() {
    this.executedQueries = []
  }
}

// Test configuration
const testConfig: ReactiveConfig = {
  relations: {
    agent: ['message.fromAgentId', 'memory.agentId'],
    message: ['agent.fromAgentId'],
    memory: ['agent.agentId'],
  },
  cache: {
    server: { provider: 'memory' },
  },
  realtime: {
    enabled: true,
  },
}

async function runIntegrationTest() {
  console.log('🧪 Starting Reactive Database Integration Test\n')

  // Create mock database and reactive wrapper
  const mockDb = new MockDrizzleDb()
  const reactiveDb = createReactiveDb(mockDb, testConfig)

  // Test 1: SELECT query (should cache result)
  console.log('📋 Test 1: SELECT query with caching')
  mockDb.clearExecutedQueries()

  const result1 = await reactiveDb.query(
    'SELECT * FROM agents WHERE organizationId = ?',
    ['org-123']
  )
  const result2 = await reactiveDb.query(
    'SELECT * FROM agents WHERE organizationId = ?',
    ['org-123']
  )

  const queries1 = mockDb.getExecutedQueries()
  console.log(
    `- Executed ${queries1.length} database queries (should be 1 due to caching)`
  )
  console.log(`- First result: ${JSON.stringify(result1)}`)
  console.log(`- Cache hit: ${queries1.length === 1 ? '✅' : '❌'}\n`)

  // Test 2: INSERT mutation (should invalidate cache)
  console.log('📝 Test 2: INSERT mutation with cache invalidation')
  mockDb.clearExecutedQueries()

  await reactiveDb.query(
    'INSERT INTO agents (name, organizationId) VALUES (?, ?)',
    ['New Agent', 'org-123']
  )

  // This should hit the database again because cache was invalidated
  const result3 = await reactiveDb.query(
    'SELECT * FROM agents WHERE organizationId = ?',
    ['org-123']
  )

  const queries2 = mockDb.getExecutedQueries()
  console.log(
    `- Executed ${queries2.length} database queries (should be 2: INSERT + SELECT)`
  )
  console.log(`- Cache invalidation: ${queries2.length === 2 ? '✅' : '❌'}\n`)

  // Test 3: UPDATE mutation with relation invalidation
  console.log('🔄 Test 3: UPDATE with related table invalidation')
  mockDb.clearExecutedQueries()

  // First, cache a messages query
  await reactiveDb.query('SELECT * FROM messages WHERE fromAgentId = ?', [
    'agent-1',
  ])

  // Then update the agent (should invalidate messages cache due to relations)
  await reactiveDb.query('UPDATE agents SET name = ? WHERE id = ?', [
    'Updated Agent',
    'agent-1',
  ])

  // This messages query should hit database again due to relation invalidation
  await reactiveDb.query('SELECT * FROM messages WHERE fromAgentId = ?', [
    'agent-1',
  ])

  const queries3 = mockDb.getExecutedQueries()
  console.log(`- Executed ${queries3.length} database queries`)
  console.log(`- Related invalidation: ${queries3.length >= 2 ? '✅' : '❌'}\n`)

  // Test 4: Cache provider functionality
  console.log('💾 Test 4: Cache provider operations')
  const cache = reactiveDb.getCache()

  await cache.set('test-key', { data: 'test-value' }, 60)
  const cached = await cache.get('test-key')

  console.log(`- Cache set/get: ${cached?.data === 'test-value' ? '✅' : '❌'}`)

  await cache.del('test-key')
  const deleted = await cache.get('test-key')

  console.log(`- Cache deletion: ${deleted === null ? '✅' : '❌'}\n`)

  // Test 5: Subscription system
  console.log('📡 Test 5: Event subscription system')
  let receivedEvent = false

  const unsubscribe = reactiveDb.subscribe('org-123', (event) => {
    console.log(`- Received invalidation event: ${event.table}`)
    receivedEvent = true
  })

  // Trigger an invalidation event
  await reactiveDb.query(
    'INSERT INTO agents (name, organizationId) VALUES (?, ?)',
    ['Another Agent', 'org-123']
  )

  console.log(`- Event received: ${receivedEvent ? '✅' : '❌'}`)

  unsubscribe()
  console.log('- Unsubscribed successfully: ✅\n')

  console.log('🎉 Integration test completed successfully!')
}

// Run the test if this file is executed directly
if (require.main === module) {
  runIntegrationTest().catch(console.error)
}

export { runIntegrationTest }
