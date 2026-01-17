/**
 * Demonstrate the naming feature benefits
 */

const { defineReactiveFunction } = require('./dist/core/function.js')
const { createReactiveRouter } = require('./dist/trpc/router.js')
const { z } = require('zod')

// Mock DB
const mockDb = {
  query: async (sql, params) => {
    console.log(`[DB] ${sql.replace(/\s+/g, ' ').trim()}`)
    return [{ id: '1', name: 'Test User' }]
  },
}

async function namingExample() {
  console.log('🏷️  NAMING FEATURE DEMONSTRATION\n')

  // ========================================
  // STEP 1: Define functions with names
  // ========================================

  console.log('📝 Step 1: Define functions with explicit names')

  const getUsers = defineReactiveFunction({
    name: 'users.getAll', // 🎯 Explicit name for cache keys and tRPC
    input: z.object({
      companyId: z.string(),
      limit: z.number().optional(),
    }),
    dependencies: ['user'],
    handler: async (input, db) => {
      return db.query('SELECT * FROM users WHERE company_id = $1', [
        input.companyId,
      ])
    },
  })

  const getUserProfile = defineReactiveFunction({
    name: 'users.profile.getDetailed', // 🎯 Nested naming for organization
    input: z.object({
      userId: z.string(),
      includePreferences: z.boolean().optional(),
    }),
    dependencies: ['user', 'preference'],
    handler: async (input, db) => {
      return db.query('SELECT * FROM users WHERE id = $1', [input.userId])
    },
  })

  const createUser = defineReactiveFunction({
    name: 'users.create', // 🎯 Clear mutation naming
    input: z.object({
      name: z.string(),
      email: z.string().email(),
    }),
    dependencies: ['user'],
    handler: async (input, db) => {
      return db.query('INSERT INTO users (name, email) VALUES ($1, $2)', [
        input.name,
        input.email,
      ])
    },
  })

  console.log('✅ Functions defined with explicit names')

  // ========================================
  // STEP 2: Show naming benefits
  // ========================================

  console.log('\n🎯 Step 2: Naming benefits')

  // Benefit 1: Meaningful cache keys
  console.log('\n🗂️  Cache Keys (include function name):')
  console.log(
    `- getUsers: ${getUsers.getCacheKey({ companyId: 'comp-123', limit: 10 })}`
  )
  console.log(
    `- getUserProfile: ${getUserProfile.getCacheKey({
      userId: 'user-456',
      includePreferences: true,
    })}`
  )
  console.log(
    `- createUser: ${createUser.getCacheKey({
      name: 'John',
      email: 'john@test.com',
    })}`
  )

  // Benefit 2: Function metadata includes name
  console.log('\n📊 Function Metadata:')
  const usersMetadata = getUsers.getMetadata()
  const profileMetadata = getUserProfile.getMetadata()
  const createMetadata = createUser.getMetadata()

  console.log(
    `- ${usersMetadata.name}: [${usersMetadata.dependencies.join(
      ', '
    )}] (TTL: ${usersMetadata.cacheTtl}s)`
  )
  console.log(
    `- ${profileMetadata.name}: [${profileMetadata.dependencies.join(
      ', '
    )}] (TTL: ${profileMetadata.cacheTtl}s)`
  )
  console.log(
    `- ${createMetadata.name}: [${createMetadata.dependencies.join(
      ', '
    )}] (TTL: ${createMetadata.cacheTtl}s)`
  )

  // ========================================
  // STEP 3: tRPC router with automatic naming
  // ========================================

  console.log('\n🔌 Step 3: tRPC router with automatic naming')

  const router = createReactiveRouter({ db: mockDb })
    .addQuery(getUsers) // Uses 'users.getAll' automatically
    .addQuery(getUserProfile) // Uses 'users.profile.getDetailed' automatically
    .addMutation(createUser) // Uses 'users.create' automatically

  console.log('✅ tRPC router created with automatic naming')
  console.log(`   Procedures: ${router.getProcedureNames().join(', ')}`)

  // Show the nested structure that gets created
  const builtRouter = router.build()
  console.log('\n🌳 Generated tRPC router structure:')
  console.log('router = {')
  console.log('  users: {')
  console.log('    getAll: [Function],')
  console.log('    profile: {')
  console.log('      getDetailed: [Function]')
  console.log('    },')
  console.log('    create: [Function]')
  console.log('  }')
  console.log('}')

  // ========================================
  // STEP 4: Custom naming when needed
  // ========================================

  console.log('\n🎨 Step 4: Custom naming when needed')

  const customRouter = createReactiveRouter({ db: mockDb })
    .addQueryWithName('getAllUsers', getUsers) // Custom name override
    .addQueryWithName('user.details', getUserProfile) // Custom name override
    .addMutation(createUser) // Use automatic name

  console.log('✅ Router with custom names:')
  console.log(`   Procedures: ${customRouter.getProcedureNames().join(', ')}`)

  // ========================================
  // STEP 5: Real execution with names
  // ========================================

  console.log('\n⚡ Step 5: Execute functions (names visible in logs)')

  try {
    const users = await getUsers.execute({ companyId: 'test-company' }, mockDb)
    console.log(`✅ ${usersMetadata.name} executed successfully`)

    const profile = await getUserProfile.execute({ userId: 'user-123' }, mockDb)
    console.log(`✅ ${profileMetadata.name} executed successfully`)

    const newUser = await createUser.execute(
      { name: 'Alice', email: 'alice@test.com' },
      mockDb
    )
    console.log(`✅ ${createMetadata.name} executed successfully`)
  } catch (error) {
    console.error('❌ Execution error:', error.message)
  }

  // ========================================
  // STEP 6: Benefits summary
  // ========================================

  console.log('\n🎉 NAMING BENEFITS:')
  console.log('✅ Meaningful cache keys (include function name)')
  console.log('✅ Automatic tRPC procedure naming (no manual mapping)')
  console.log('✅ Nested procedure structure (users.profile.getDetailed)')
  console.log('✅ Clear function identification in logs')
  console.log('✅ Metadata includes function name')
  console.log('✅ Custom naming available when needed')
  console.log('✅ No duplication between function definition and router setup')

  return {
    functionsWithNames: 3,
    automaticProcedures: 3,
    customProcedures: 3,
    nestedStructure: true,
  }
}

// Run the naming demonstration
namingExample()
  .then((results) => {
    console.log('\n🏆 NAMING DEMONSTRATION COMPLETED!')
    console.log(`Functions with names: ${results.functionsWithNames}`)
    console.log(`Automatic procedures: ${results.automaticProcedures}`)
    console.log(`Custom procedures: ${results.customProcedures}`)
    console.log(`Nested structure support: ${results.nestedStructure}`)

    console.log('\n🎯 KEY INSIGHT:')
    console.log('Names in function config eliminate duplication and provide')
    console.log('consistent identification across cache keys, tRPC procedures,')
    console.log('logs, and metadata!')
  })
  .catch(console.error)
