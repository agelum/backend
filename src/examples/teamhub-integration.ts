/**
 * Example integration with Agelum using the corrected reactive function architecture
 */

import { z } from 'zod'
import { defineReactiveFunction } from '../core/function'
import type { ReactiveConfig } from '../core/types'

// Generic Agelum reactive configuration (no hardcoded fields)
export const agelumReactiveConfig: ReactiveConfig = {
  relations: {
    agent: ['message.fromAgentId', 'memory.agentId'],
    organization: ['agent.organizationId', 'tool.organizationId'],
    message: ['agent.fromAgentId', 'agent.toAgentId'],
    memory: ['agent.agentId'],
    tool: ['organization.id'],
  },
  cache: {
    server: { provider: 'memory' },
    client: { provider: 'localStorage' },
  },
  realtime: {
    enabled: true,
  },
}

// Example reactive functions using the corrected API

/**
 * Get all agents for an organization
 */
export const getAgents = defineReactiveFunction({
  name: 'agents.getAll',
  input: z.object({
    organizationId: z.string(),
  }),
  dependencies: ['agent'],
  handler: async ({ input, db }) => {
    return db.query(
      `
      SELECT * FROM agents
      WHERE organization_id = $1
      ORDER BY created_at DESC
    `,
      [input.organizationId]
    )
  },
})

/**
 * Get agent with detailed statistics
 */
export const getAgentWithStats = defineReactiveFunction({
  name: 'agents.getWithStats',
  input: z.object({
    organizationId: z.string(),
    agentId: z.string(),
  }),
  dependencies: ['agent', 'message', 'memory'],
  invalidateWhen: {
    agent: (change) => change.keys.includes('agentId'),
    message: (change) => change.keys.includes('agentId'),
    memory: (change) => change.keys.includes('agentId'),
  },
  cache: {
    ttl: 180, // 3 minutes for detailed stats
  },
  handler: async ({ input, db }) => {
    const [agent, messageCount, memoryCount, lastMessage] = await Promise.all([
      db.query(
        `
        SELECT * FROM agents
        WHERE id = $1 AND organization_id = $2
      `,
        [input.agentId, input.organizationId]
      ),

      db.query(
        `
        SELECT COUNT(*) as count FROM messages
        WHERE from_agent_id = $1
      `,
        [input.agentId]
      ),

      db.query(
        `
        SELECT COUNT(*) as count FROM memory
        WHERE agent_id = $1
      `,
        [input.agentId]
      ),

      db.query(
        `
        SELECT * FROM messages
        WHERE from_agent_id = $1
        ORDER BY created_at DESC
        LIMIT 1
      `,
        [input.agentId]
      ),
    ])

    return {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      agent: (agent as any[])[0],
      stats: {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        messageCount: (messageCount as any[])[0]?.count || 0,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        memoryCount: (memoryCount as any[])[0]?.count || 0,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        lastActive: (lastMessage as any[])[0]?.created_at || null,
      },
      recentMessages: lastMessage,
    }
  },
})

/**
 * Update agent data
 */
export const updateAgent = defineReactiveFunction({
  name: 'agents.update',
  input: z.object({
    organizationId: z.string(),
    id: z.string(),
    data: z.object({
      name: z.string().optional(),
      role: z.string().optional(),
      systemPrompt: z.string().optional(),
      isActive: z.boolean().optional(),
    }),
  }),
  dependencies: ['agent'],
  invalidateWhen: {
    agent: (change) => change.keys.includes('id'),
  },
  handler: async ({ input, db }) => {
    const updateFields = Object.entries(input.data)
      .filter(([, value]) => value !== undefined)
      .map(([key], index) => `${key} = $${index + 3}`)
      .join(', ')

    const updateValues = Object.values(input.data).filter(
      (value) => value !== undefined
    )

    return db.query(
      `
      UPDATE agents
      SET ${updateFields}, updated_at = NOW()
      WHERE id = $1 AND organization_id = $2
      RETURNING *
    `,
      [input.id, input.organizationId, ...updateValues]
    )
  },
})

// Example usage patterns (React components would go in separate .tsx files)

/**
 * Example: How to use getAgents function
 */
export async function loadAgentsExample(
  organizationId: string,
  reactiveDb: any
) {
  // Standalone usage (server-side)
  const agents = await getAgents.execute({ organizationId }, reactiveDb)
  console.log('Loaded agents:', (agents as any[]).length)
  return agents
}

/**
 * Example: How to use getAgentWithStats function
 */
export async function loadAgentDetailsExample(
  organizationId: string,
  agentId: string,
  reactiveDb: any
) {
  // This function can be called both ways:
  // 1. Standalone: await getAgentWithStats.execute({ organizationId, agentId }, reactiveDb)
  // 2. Via tRPC: trpc.agents.getWithStats.useQuery({ organizationId, agentId })

  const agentDetails = await getAgentWithStats.execute(
    { organizationId, agentId },
    reactiveDb
  )
  console.log('Loaded agent details for:', agentId)
  return agentDetails
}

// Example of how to set up tRPC router with these functions

/*
import { createReactiveRouter } from '../trpc/router'

export function createTeamHubRouter(db, config) {
  return createReactiveRouter({ db, config })
    .addQuery(getAgents)        // Uses 'agents.getAll' automatically
    .addQuery(getAgentWithStats) // Uses 'agents.getWithStats' automatically
    .addMutation(updateAgent)    // Uses 'agents.update' automatically
    .build()
}
*/

// Example of server-side usage

/*
export async function serverSideExample(reactiveDb) {
  // Functions can be executed directly on the server
  const agents = await getAgents.execute(
    { organizationId: 'org-123' },
    reactiveDb
  )

  const agentDetails = await getAgentWithStats.execute(
    { organizationId: 'org-123', agentId: 'agent-456' },
    reactiveDb
  )

  const updatedAgent = await updateAgent.execute(
    {
      organizationId: 'org-123',
      id: 'agent-456',
      data: { name: 'Updated Agent Name' }
    },
    reactiveDb
  )

  return { agents, agentDetails, updatedAgent }
}
*/
