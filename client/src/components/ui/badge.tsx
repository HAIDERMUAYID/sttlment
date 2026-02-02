import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-lg border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-[#026174] text-white hover:bg-[#01505f]",
        secondary:
          "border-transparent bg-[#068294] text-white hover:bg-[#057a8a]",
        destructive:
          "border-transparent bg-[#ef4444] text-white hover:bg-[#dc2626]",
        outline: "border-[rgba(2,97,116,0.3)] bg-transparent text-[#026174]",
        success:
          "border-transparent bg-[#22c55e] text-white hover:bg-[#16a34a]",
        warning:
          "border-transparent bg-[#f59e0b] text-white hover:bg-[#d97706]",
        info:
          "border-transparent bg-[#026174] text-white hover:bg-[#01505f]",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
