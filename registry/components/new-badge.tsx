"use client"

import { useNewFeature } from "featuredrop/react/hooks"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

interface NewBadgeProps {
  /** The sidebar/feature key to check for newness */
  featureKey: string
  /** Optional label text (defaults to "New") */
  label?: string
  /** Additional class names */
  className?: string
  /** Dismiss on click (defaults to true) */
  dismissOnClick?: boolean
}

export function NewBadge({
  featureKey,
  label = "New",
  className,
  dismissOnClick = true,
}: NewBadgeProps) {
  const { isNew, dismiss } = useNewFeature(featureKey)

  if (!isNew) return null

  return (
    <Badge
      variant="default"
      className={cn("cursor-pointer", className)}
      onClick={dismissOnClick ? dismiss : undefined}
    >
      {label}
    </Badge>
  )
}
