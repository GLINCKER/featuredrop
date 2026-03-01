"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"

interface FeedbackPayload {
  category: string
  message: string
}

interface FeedbackWidgetProps {
  /** Categories to display in the select dropdown */
  categories?: string[]
  /** Trigger button label (defaults to "Feedback") */
  triggerLabel?: string
  /** Dialog title (defaults to "Send Feedback") */
  title?: string
  /** Dialog description */
  description?: string
  /** Called when the user submits feedback */
  onSubmit: (payload: FeedbackPayload) => void | Promise<void>
  /** Additional class names for the trigger button */
  className?: string
}

export function FeedbackWidget({
  categories = ["Bug", "Feature Request", "Improvement", "Other"],
  triggerLabel = "Feedback",
  title = "Send Feedback",
  description = "We'd love to hear from you. What's on your mind?",
  onSubmit,
  className,
}: FeedbackWidgetProps) {
  const [open, setOpen] = useState(false)
  const [category, setCategory] = useState(categories[0])
  const [message, setMessage] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async () => {
    if (!message.trim()) return
    setIsSubmitting(true)
    try {
      await onSubmit({ category, message: message.trim() })
      setMessage("")
      setCategory(categories[0])
      setOpen(false)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className={cn(className)}>
          {triggerLabel}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="fd-feedback-category">Category</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger id="fd-feedback-category">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {categories.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="fd-feedback-message">Message</Label>
            <Textarea
              id="fd-feedback-message"
              placeholder="Tell us what's on your mind..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={4}
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting || !message.trim()}
          >
            {isSubmitting ? "Sending..." : "Submit"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
