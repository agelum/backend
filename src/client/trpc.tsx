'use client'

import React from 'react'
import { ReactiveProvider } from './provider'

type RelationsMap = Record<string, string[]>

export function createTrpcRevalidateFn(trpcClient: any) {
  return async (compositeKey: string) => {
    const [name, inputJson] = compositeKey.split('::')
    const input = inputJson ? JSON.parse(inputJson) : undefined

    const parts = name.split('.')
    let cursor: any = trpcClient
    for (const part of parts) cursor = cursor?.[part]

    if (cursor?.query) return await cursor.query(input)
    if (cursor?.mutate) return await cursor.mutate(input)

    throw new Error(`Unknown tRPC procedure for key: ${name}`)
  }
}

interface TrpcReactiveProviderProps {
  children: React.ReactNode
  organizationId: string
  relations: RelationsMap
  trpcClient: any
}

export function TrpcReactiveProvider({
  children,
  organizationId,
  relations,
  trpcClient,
}: TrpcReactiveProviderProps) {
  const revalidateFn = React.useMemo(
    () => createTrpcRevalidateFn(trpcClient),
    [trpcClient]
  )

  const config = {
    relations,
    organizationId,
    revalidateFn,
  }

  return <ReactiveProvider config={config}>{children}</ReactiveProvider>
}
