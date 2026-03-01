"use client"

import { FeatureDropProvider } from "featuredrop/react"
import { LocalStorageAdapter } from "featuredrop/adapters"
import { features } from "@/lib/features"

const storage = new LocalStorageAdapter({ prefix: "featuredrop-shadcn-demo" })

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <FeatureDropProvider manifest={features} storage={storage}>
      {children}
    </FeatureDropProvider>
  )
}
