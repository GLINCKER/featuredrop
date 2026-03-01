"use client"

import { useChecklist } from "featuredrop/react"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Progress } from "@/components/ui/progress"
import { cn } from "@/lib/utils"

interface ChecklistTask {
  id: string
  title: string
  description?: string
}

interface ChecklistProps {
  /** Checklist ID — must match the ID registered with FeatureDrop */
  checklistId: string
  /** Task definitions (display info only — state is managed by FeatureDrop) */
  tasks: ChecklistTask[]
  /** Card title (defaults to "Getting Started") */
  title?: string
  /** Card description */
  description?: string
  /** Additional class names */
  className?: string
}

export function Checklist({
  checklistId,
  tasks,
  title = "Getting Started",
  description,
  className,
}: ChecklistProps) {
  const {
    completeTask,
    resetChecklist,
    dismissChecklist,
    progress,
    tasks: taskStates,
    dismissed,
  } = useChecklist(checklistId)

  if (dismissed) return null

  const getTaskState = (taskId: string) =>
    taskStates.find((t) => t.id === taskId)

  return (
    <Card className={cn("w-full max-w-md", className)}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
        <Progress value={progress.percent} className="mt-2" />
        <p className="text-xs text-muted-foreground mt-1">
          {progress.completed} of {progress.total} complete
        </p>
      </CardHeader>
      <CardContent className="grid gap-3">
        {tasks.map((task) => {
          const state = getTaskState(task.id)
          const completed = state?.completed ?? false
          return (
            <label
              key={task.id}
              className={cn(
                "flex items-start gap-3 rounded-lg border p-3 transition-colors",
                completed
                  ? "bg-muted/50 opacity-60"
                  : "hover:bg-muted/50 cursor-pointer"
              )}
            >
              <Checkbox
                checked={completed}
                onCheckedChange={() => {
                  if (!completed) completeTask(task.id)
                }}
                disabled={completed}
                className="mt-0.5"
              />
              <div className="space-y-1">
                <p
                  className={cn(
                    "text-sm font-medium leading-none",
                    completed && "line-through"
                  )}
                >
                  {task.title}
                </p>
                {task.description && (
                  <p className="text-xs text-muted-foreground">
                    {task.description}
                  </p>
                )}
              </div>
            </label>
          )
        })}
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button variant="ghost" size="sm" onClick={resetChecklist}>
          Reset
        </Button>
        <Button variant="ghost" size="sm" onClick={dismissChecklist}>
          Dismiss
        </Button>
      </CardFooter>
    </Card>
  )
}
