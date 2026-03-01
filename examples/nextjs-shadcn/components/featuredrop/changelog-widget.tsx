"use client"

import { useChangelog } from "featuredrop/react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { cn } from "@/lib/utils"

interface ChangelogWidgetProps {
  /** Panel title (defaults to "What's New") */
  title?: string
  /** Trigger button label (defaults to "What's New") */
  triggerLabel?: string
  /** Additional class names for the trigger button */
  className?: string
  /** Sheet opens from this side (defaults to "right") */
  side?: "top" | "right" | "bottom" | "left"
}

export function ChangelogWidget({
  title = "What's New",
  triggerLabel = "What's New",
  className,
  side = "right",
}: ChangelogWidgetProps) {
  const {
    features,
    newCount,
    isNew,
    dismiss,
    markAllSeen,
  } = useChangelog()

  return (
    <Sheet onOpenChange={(open) => { if (!open) markAllSeen() }}>
      <SheetTrigger asChild>
        <Button variant="outline" className={cn("relative", className)}>
          {triggerLabel}
          {newCount > 0 && (
            <Badge variant="destructive" className="ml-2">
              {newCount}
            </Badge>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent side={side} className="flex flex-col">
        <SheetHeader>
          <SheetTitle>{title}</SheetTitle>
        </SheetHeader>
        <ScrollArea className="flex-1 -mx-6 px-6">
          <div className="space-y-1">
            {features.map((feature, i) => (
              <div key={feature.id}>
                <button
                  type="button"
                  className={cn(
                    "w-full rounded-lg p-3 text-left transition-colors hover:bg-muted",
                    isNew(feature.sidebarKey ?? feature.id) && "bg-muted/50"
                  )}
                  onClick={() => dismiss(feature.id)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1">
                      <p className="text-sm font-medium leading-none">
                        {feature.label}
                      </p>
                      {feature.description && (
                        <p className="text-sm text-muted-foreground">
                          {feature.description}
                        </p>
                      )}
                    </div>
                    {isNew(feature.sidebarKey ?? feature.id) && (
                      <Badge variant="default" className="shrink-0">
                        New
                      </Badge>
                    )}
                  </div>
                  {feature.version && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      v{typeof feature.version === "string" ? feature.version : feature.version.introduced}
                    </p>
                  )}
                </button>
                {i < features.length - 1 && <Separator />}
              </div>
            ))}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  )
}
