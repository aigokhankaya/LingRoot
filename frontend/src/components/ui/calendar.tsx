import * as React from "react"
import { cn } from "@/lib/utils"

export interface CalendarProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, 'onSelect'> {
  mode?: "single"
  selected?: Date
  onSelect?: (date: Date | undefined) => void
}

const Calendar = React.forwardRef<HTMLDivElement, CalendarProps>(
  ({ className, mode, selected, onSelect, ...props }, ref) => {
    const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const date = e.target.value ? new Date(e.target.value) : undefined
      onSelect?.(date)
    }

    const formatDate = (date: Date | undefined) => {
      if (!date) return ""
      return date.toISOString().split('T')[0]
    }

    return (
      <div
        ref={ref}
        className={cn("p-3", className)}
        {...props}
      >
        <input
          type="date"
          className="w-full px-3 py-2 border rounded-md"
          value={formatDate(selected)}
          onChange={handleDateChange}
        />
      </div>
    )
  }
)
Calendar.displayName = "Calendar"

export { Calendar } 