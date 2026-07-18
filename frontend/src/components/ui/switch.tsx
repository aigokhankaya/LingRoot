import * as React from "react"
import { cn } from "@/lib/utils"

export interface SwitchProps
  extends React.InputHTMLAttributes<HTMLInputElement> {}

const Switch = React.forwardRef<HTMLInputElement, SwitchProps>(
  ({ className, ...props }, ref) => {
    return (
      <input
        type="checkbox"
        role="switch"
        className={cn(
          "peer relative inline-flex h-6 w-11 shrink-0 cursor-pointer appearance-none items-center rounded-full border-2 border-transparent bg-gray-300 transition-colors after:block after:h-5 after:w-5 after:rounded-full after:bg-white after:shadow-sm after:transition-transform checked:bg-primary checked:after:translate-x-5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Switch.displayName = "Switch"

export { Switch }
