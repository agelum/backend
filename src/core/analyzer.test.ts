/**
 * Tests for the SQL analyzer
 * These tests verify that our SQL parsing logic works correctly
 */

import {
  analyzeSql,
  queryAffectsTable,
  extractAllTableReferences,
} from './analyzer'

describe('SQL Analyzer', () => {
  describe('analyzeSql', () => {
    it('should analyze SELECT queries correctly', () => {
      const sql =
        'SELECT id, name, organizationId FROM agents WHERE organizationId = ? AND isActive = true'
      const params = ['org-123']

      const result = analyzeSql(sql, params)

      expect(result.operation).toBe('SELECT')
      expect(result.table).toBe('agents')
      expect(result.whereKeys).toContain('organizationId')
      expect(result.whereKeys).toContain('isActive')
      expect(result.columns).toContain('id')
      expect(result.columns).toContain('name')
      expect(result.organizationId).toBe('org-123')
    })

    it('should analyze INSERT queries correctly', () => {
      const sql =
        'INSERT INTO messages (id, content, fromAgentId, organizationId) VALUES (?, ?, ?, ?)'
      const params = ['msg-1', 'Hello', 'agent-1', 'org-123']

      const result = analyzeSql(sql, params)

      expect(result.operation).toBe('INSERT')
      expect(result.table).toBe('messages')
      expect(result.columns).toContain('id')
      expect(result.columns).toContain('content')
      expect(result.columns).toContain('fromAgentId')
      expect(result.organizationId).toBe('org-123')
    })

    it('should analyze UPDATE queries correctly', () => {
      const sql =
        'UPDATE agents SET name = ?, isActive = ? WHERE id = ? AND organizationId = ?'
      const params = ['New Name', true, 'agent-1', 'org-123']

      const result = analyzeSql(sql, params)

      expect(result.operation).toBe('UPDATE')
      expect(result.table).toBe('agents')
      expect(result.columns).toContain('name')
      expect(result.columns).toContain('isActive')
      expect(result.whereKeys).toContain('id')
      expect(result.whereKeys).toContain('organizationId')
      expect(result.organizationId).toBe('org-123')
    })

    it('should analyze DELETE queries correctly', () => {
      const sql = 'DELETE FROM memory WHERE agentId = ? AND organizationId = ?'
      const params = ['agent-1', 'org-123']

      const result = analyzeSql(sql, params)

      expect(result.operation).toBe('DELETE')
      expect(result.table).toBe('memory')
      expect(result.whereKeys).toContain('agentId')
      expect(result.whereKeys).toContain('organizationId')
      expect(result.organizationId).toBe('org-123')
    })

    it('should handle complex SELECT with JOINs', () => {
      const sql = `
        SELECT a.id, a.name, m.content
        FROM agents a
        JOIN messages m ON a.id = m.fromAgentId
        WHERE a.organizationId = ? AND m.createdAt > ?
      `
      const params = ['org-123', '2024-01-01']

      const result = analyzeSql(sql, params)

      expect(result.operation).toBe('SELECT')
      expect(result.table).toBe('agents') // First table in FROM clause
      expect(result.whereKeys).toContain('organizationId')
      expect(result.whereKeys).toContain('createdAt')
      expect(result.organizationId).toBe('org-123')
    })

    it('should detect organizationId from SQL string', () => {
      const sql = "SELECT * FROM agents WHERE organizationId = 'org-456'"

      const result = analyzeSql(sql)

      expect(result.organizationId).toBe('org-456')
    })

    it('should handle snake_case organization_id', () => {
      const sql = "SELECT * FROM agents WHERE organization_id = 'org-789'"

      const result = analyzeSql(sql)

      expect(result.organizationId).toBe('org-789')
    })
  })

  describe('queryAffectsTable', () => {
    it('should correctly identify if query affects a table', () => {
      const sql = 'SELECT * FROM agents WHERE id = ?'

      expect(queryAffectsTable(sql, 'agents')).toBe(true)
      expect(queryAffectsTable(sql, 'messages')).toBe(false)
    })
  })

  describe('extractAllTableReferences', () => {
    it('should extract all table references from complex query', () => {
      const sql = `
        SELECT a.name, m.content, mem.data
        FROM agents a
        LEFT JOIN messages m ON a.id = m.fromAgentId
        INNER JOIN memory mem ON a.id = mem.agentId
        WHERE a.organizationId = ?
      `

      const tables = extractAllTableReferences(sql)

      expect(tables).toContain('agents')
      expect(tables).toContain('messages')
      expect(tables).toContain('memory')
      expect(tables).toHaveLength(3)
    })

    it('should handle UPDATE with subqueries', () => {
      const sql = `
        UPDATE agents
        SET lastMessageAt = (SELECT MAX(createdAt) FROM messages WHERE fromAgentId = agents.id)
        WHERE organizationId = ?
      `

      const tables = extractAllTableReferences(sql)

      expect(tables).toContain('agents')
      expect(tables).toContain('messages')
    })
  })
})

// Mock Jest functions for basic testing
if (typeof describe === 'undefined') {
  global.describe = (name: string, fn: () => void) => {
    console.log(`\n--- ${name} ---`)
    fn()
  }

  global.it = (name: string, fn: () => void) => {
    try {
      fn()
      console.log(`✅ ${name}`)
    } catch (error) {
      console.error(`❌ ${name}:`, error)
    }
  }

  global.expect = (actual: any) => ({
    toBe: (expected: any) => {
      if (actual !== expected) {
        throw new Error(`Expected ${actual} to be ${expected}`)
      }
    },
    toContain: (expected: any) => {
      if (!Array.isArray(actual) || !actual.includes(expected)) {
        throw new Error(
          `Expected ${JSON.stringify(actual)} to contain ${expected}`
        )
      }
    },
    toHaveLength: (expected: number) => {
      if (!Array.isArray(actual) || actual.length !== expected) {
        throw new Error(
          `Expected array to have length ${expected}, got ${actual.length}`
        )
      }
    },
  })
}
