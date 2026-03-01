"use client"

import { useEffect, useRef, useState } from "react"
import { useTour } from "featuredrop/react"
import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverAnchor,
  PopoverContent,
} from "@/components/ui/popover"
import { Progress } from "@/components/ui/progress"
import { cn } from "@/lib/utils"

interface TourProps {
  /** Tour ID — must match the ID registered with FeatureDrop */
  tourId: string
  /** Additional class names for the popover content */
  className?: string
}

export function Tour({ tourId, className }: TourProps) {
  const {
    isActive,
    currentStep,
    currentStepIndex,
    totalSteps,
    nextStep,
    prevStep,
    skipTour,
    closeTour,
  } = useTour(tourId)

  const anchorRef = useRef<HTMLDivElement>(null)
  const [targetEl, setTargetEl] = useState<Element | null>(null)

  useEffect(() => {
    if (!isActive || !currentStep) {
      setTargetEl(null)
      return
    }

    const target =
      typeof currentStep.target === "string"
        ? document.querySelector(currentStep.target)
        : null

    setTargetEl(target)
  }, [isActive, currentStep])

  // Position the invisible anchor over the target element
  useEffect(() => {
    if (!targetEl || !anchorRef.current) return

    const update = () => {
      const rect = targetEl.getBoundingClientRect()
      const anchor = anchorRef.current
      if (!anchor) return
      anchor.style.position = "fixed"
      anchor.style.top = `${rect.top + rect.height / 2}px`
      anchor.style.left = `${rect.left + rect.width / 2}px`
      anchor.style.width = "1px"
      anchor.style.height = "1px"
      anchor.style.pointerEvents = "none"
    }

    update()
    window.addEventListener("scroll", update, true)
    window.addEventListener("resize", update)
    return () => {
      window.removeEventListener("scroll", update, true)
      window.removeEventListener("resize", update)
    }
  }, [targetEl])

  if (!isActive || !currentStep) return null

  const isFirst = currentStepIndex === 0
  const isLast = currentStepIndex === totalSteps - 1
  const percent = ((currentStepIndex + 1) / totalSteps) * 100

  return (
    <Popover open={isActive}>
      <PopoverAnchor asChild>
        <div ref={anchorRef} />
      </PopoverAnchor>
      <PopoverContent
        className={cn("w-80", className)}
        side="bottom"
        align="center"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <div className="space-y-3">
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">
              Step {currentStepIndex + 1} of {totalSteps}
            </p>
            {currentStep.title && (
              <p className="text-sm font-medium">{currentStep.title}</p>
            )}
            {currentStep.content && (
              <p className="text-sm text-muted-foreground">
                {String(currentStep.content)}
              </p>
            )}
          </div>
          <Progress value={percent} className="h-1" />
          <div className="flex items-center justify-between">
            <Button variant="ghost" size="sm" onClick={skipTour}>
              Skip
            </Button>
            <div className="flex gap-2">
              {!isFirst && (
                <Button variant="outline" size="sm" onClick={prevStep}>
                  Back
                </Button>
              )}
              <Button
                size="sm"
                onClick={isLast ? closeTour : nextStep}
              >
                {isLast ? "Done" : "Next"}
              </Button>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
