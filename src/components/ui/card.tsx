import * as React from "react"
import { cn } from "@/lib/utils"

export const Card = ({ className, ...props }: React.ComponentProps<"div">) => (
  <div
    data-slot="card"
    className={cn(
      "rounded-xl border border-[var(--border)] bg-[var(--card)] text-[var(--card-foreground)] shadow-sm",
      className
    )}
    {...props}
  />
)

export const CardHeader = ({ className, ...props }: React.ComponentProps<"div">) => (
  <div
    data-slot="card-header"
    className={cn("flex flex-col gap-1 px-4 pt-4", className)}
    {...props}
  />
)

export const CardTitle = ({ className, ...props }: React.ComponentProps<"h3">) => (
  <h3
    data-slot="card-title"
    className={cn("text-sm font-semibold leading-tight tracking-tight", className)}
    {...props}
  />
)

export const CardDescription = ({ className, ...props }: React.ComponentProps<"p">) => (
  <p
    data-slot="card-description"
    className={cn("text-xs text-[var(--muted-foreground)]", className)}
    {...props}
  />
)

export const CardContent = ({ className, ...props }: React.ComponentProps<"div">) => (
  <div data-slot="card-content" className={cn("px-4 py-3", className)} {...props} />
)

export const CardFooter = ({ className, ...props }: React.ComponentProps<"div">) => (
  <div
    data-slot="card-footer"
    className={cn("flex items-center px-4 pb-4", className)}
    {...props}
  />
)
