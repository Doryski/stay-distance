import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const alertVariants = cva(
  "relative w-full rounded-md border px-3 py-2 text-sm [&>svg]:absolute [&>svg]:left-3 [&>svg]:top-2.5 [&>svg]:size-4 [&>svg~*]:pl-6",
  {
    variants: {
      variant: {
        default: "border-[var(--border)] bg-[var(--card)] text-[var(--foreground)]",
        destructive:
          "border-[var(--destructive)]/40 bg-[var(--destructive)]/10 text-[var(--destructive)] [&>svg]:text-[var(--destructive)]",
      },
    },
    defaultVariants: { variant: "default" },
  }
)

type AlertProps = React.ComponentProps<"div"> & VariantProps<typeof alertVariants>

export const Alert = ({ className, variant, ...props }: AlertProps) => (
  <div
    data-slot="alert"
    role="alert"
    className={cn(alertVariants({ variant }), className)}
    {...props}
  />
)

export const AlertDescription = ({
  className,
  ...props
}: React.ComponentProps<"div">) => (
  <div
    data-slot="alert-description"
    className={cn("text-xs leading-relaxed", className)}
    {...props}
  />
)
