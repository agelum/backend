import type { SqlAnalysis } from './types.js'

/**
 * Advanced SQL analyzer that extracts metadata from queries
 * This is core to the reactive system's intelligence
 */
export function analyzeSql(sql: string, params?: any[]): SqlAnalysis {
  const normalizedSql = sql.replace(/\s+/g, ' ').trim()
  const upperSql = normalizedSql.toUpperCase()

  // Determine operation type
  const operation = determineOperation(upperSql)

  // Extract table name
  const table = extractTableName(upperSql, operation)

  // Extract WHERE clause keys
  const whereKeys = extractWhereKeys(normalizedSql, params)

  // Extract affected columns
  const columns = extractColumns(normalizedSql, operation)

  // Detect organization ID from query
  const organizationId = detectOrganizationId(normalizedSql, params)

  return {
    table,
    operation,
    whereKeys,
    columns,
    organizationId,
  }
}

/**
 * Determine the SQL operation type
 */
function determineOperation(upperSql: string): SqlAnalysis['operation'] {
  if (upperSql.startsWith('SELECT')) return 'SELECT'
  if (upperSql.startsWith('INSERT')) return 'INSERT'
  if (upperSql.startsWith('UPDATE')) return 'UPDATE'
  if (upperSql.startsWith('DELETE')) return 'DELETE'
  return 'SELECT' // Default fallback
}

/**
 * Extract table name from SQL query
 */
function extractTableName(upperSql: string, operation: string): string {
  let match: RegExpMatchArray | null = null

  switch (operation) {
    case 'SELECT':
      // Match: SELECT ... FROM table_name
      match = upperSql.match(/FROM\s+(["`]?)(\w+)\1(?:\s|$|,|\))/i)
      break
    case 'INSERT':
      // Match: INSERT INTO table_name
      match = upperSql.match(/INSERT\s+INTO\s+(["`]?)(\w+)\1/i)
      break
    case 'UPDATE':
      // Match: UPDATE table_name SET
      match = upperSql.match(/UPDATE\s+(["`]?)(\w+)\1\s+SET/i)
      break
    case 'DELETE':
      // Match: DELETE FROM table_name
      match = upperSql.match(/DELETE\s+FROM\s+(["`]?)(\w+)\1/i)
      break
  }

  if (match && match[2]) {
    return match[2].toLowerCase()
  }

  // Fallback: try to extract any quoted or unquoted identifier after common keywords
  const fallbackMatch = upperSql.match(
    /(?:FROM|INTO|UPDATE|JOIN)\s+(["`]?)(\w+)\1/i
  )
  return fallbackMatch ? fallbackMatch[2].toLowerCase() : 'unknown'
}

/**
 * Extract WHERE clause keys for cache invalidation
 */
function extractWhereKeys(sql: string, params?: any[]): string[] {
  const keys: string[] = []

  // Extract column names from WHERE conditions
  const whereMatch = sql.match(
    /WHERE\s+(.+?)(?:\s+ORDER\s+BY|\s+GROUP\s+BY|\s+LIMIT|\s+HAVING|$)/i
  )
  if (!whereMatch) return keys

  const whereClause = whereMatch[1]

  // Find column references in WHERE clause
  const columnMatches = whereClause.match(
    /(["`]?)(\w+)\1\s*(?:=|!=|<|>|<=|>=|IN|LIKE|IS)/gi
  )
  if (columnMatches) {
    columnMatches.forEach((match) => {
      const columnMatch = match.match(/(["`]?)(\w+)\1/)
      if (columnMatch && columnMatch[2]) {
        keys.push(columnMatch[2].toLowerCase())
      }
    })
  }

  // Add parameter-based keys if we can infer them
  if (params && params.length > 0) {
    // Common column names that often appear in WHERE clauses
    const commonKeys = [
      'id',
      'organizationId',
      'agentId',
      'userId',
      'fromAgentId',
      'toAgentId',
    ]
    commonKeys.forEach((key) => {
      if (
        whereClause.toLowerCase().includes(key.toLowerCase()) &&
        !keys.includes(key)
      ) {
        keys.push(key)
      }
    })
  }

  return [...new Set(keys)] // Remove duplicates
}

/**
 * Extract affected columns from SQL query
 */
function extractColumns(sql: string, operation: string): string[] {
  const columns: string[] = []

  switch (operation) {
    case 'SELECT':
      // Extract selected columns
      const selectMatch = sql.match(/SELECT\s+(.+?)\s+FROM/i)
      if (selectMatch && !selectMatch[1].includes('*')) {
        const selectedCols = selectMatch[1].split(',').map((col) => {
          const cleanCol = col.trim().replace(/["`]/g, '')
          // Handle aliases (col AS alias or col alias)
          const parts = cleanCol.split(/\s+(?:AS\s+)?/i)
          return parts[0].split('.').pop() || cleanCol // Get column name without table prefix
        })
        columns.push(...selectedCols)
      }
      break

    case 'INSERT':
      // Extract columns from INSERT statement
      const insertMatch = sql.match(/\(([^)]+)\)\s*VALUES/i)
      if (insertMatch) {
        const cols = insertMatch[1]
          .split(',')
          .map((col) => col.trim().replace(/["`]/g, ''))
        columns.push(...cols)
      }
      break

    case 'UPDATE':
      // Extract columns from SET clause
      const setMatch = sql.match(/SET\s+(.+?)(?:\s+WHERE|$)/i)
      if (setMatch) {
        const setClauses = setMatch[1].split(',')
        setClauses.forEach((clause) => {
          const colMatch = clause.trim().match(/^(["`]?)(\w+)\1\s*=/)
          if (colMatch && colMatch[2]) {
            columns.push(colMatch[2])
          }
        })
      }
      break
  }

  return [...new Set(columns.map((col) => col.toLowerCase()))] // Remove duplicates and normalize
}

/**
 * Detect organization ID from query for multi-tenant scoping
 */
function detectOrganizationId(sql: string, params?: any[]): string | undefined {
  // Look for organizationId in WHERE clause
  const orgIdMatch = sql.match(/organizationId\s*=\s*(['"]?)([^'\s,)]+)\1/i)
  if (orgIdMatch && orgIdMatch[2]) {
    return orgIdMatch[2]
  }

  // Look for organization_id (snake_case variant)
  const orgIdSnakeMatch = sql.match(
    /organization_id\s*=\s*(['"]?)([^'\s,)]+)\1/i
  )
  if (orgIdSnakeMatch && orgIdSnakeMatch[2]) {
    return orgIdSnakeMatch[2]
  }

  // If we have parameters, try to infer from parameter positions
  if (params && params.length > 0) {
    // This is a heuristic - in many cases, organizationId is the first or second parameter
    const possibleOrgId = params.find(
      (param) =>
        typeof param === 'string' &&
        (param.startsWith('org-') ||
          param.startsWith('org_') ||
          param.length > 10)
    )

    if (possibleOrgId) {
      return possibleOrgId
    }
  }

  return undefined
}

/**
 * Utility function to check if a query affects a specific table
 */
export function queryAffectsTable(sql: string, tableName: string): boolean {
  const analysis = analyzeSql(sql)
  return analysis.table === tableName.toLowerCase()
}

/**
 * Utility function to extract all table references from a complex query
 */
export function extractAllTableReferences(sql: string): string[] {
  const tables: string[] = []
  const upperSql = sql.toUpperCase()

  // Find all table references in FROM, JOIN, UPDATE, INSERT INTO, etc.
  const patterns = [
    /FROM\s+(["`]?)(\w+)\1/gi,
    /JOIN\s+(["`]?)(\w+)\1/gi,
    /UPDATE\s+(["`]?)(\w+)\1/gi,
    /INSERT\s+INTO\s+(["`]?)(\w+)\1/gi,
  ]

  patterns.forEach((pattern) => {
    let match
    while ((match = pattern.exec(upperSql)) !== null) {
      if (match[2]) {
        tables.push(match[2].toLowerCase())
      }
    }
  })

  return [...new Set(tables)] // Remove duplicates
}
