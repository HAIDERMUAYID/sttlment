import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:scale-95",
  {
    variants: {
      variant: {
        default: "bg-primary text-white hover:bg-primary/90 shadow-md hover:shadow-lg",
        destructive:
          "bg-destructive text-white hover:bg-destructive/90",
        outline:
          "border bg-background hover:bg-accent hover:text-accent-foreground",
        secondary:
          "bg-secondary text-white hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, style, ...props }, ref) => {
    const primary = '#088395';
    const primaryHover = '#09637E';
    const primaryLight = 'rgba(8, 131, 149, 0.12)';
    const baseStyle = variant === 'outline' ? {
      borderColor: 'rgba(8, 131, 149, 0.35)',
      background: '#ffffff',
      color: primary,
      ...(style || {})
    } : variant === 'default' ? {
      background: primary,
      color: '#ffffff',
      boxShadow: '0 2px 8px rgba(8, 131, 149, 0.35)',
      border: 'none',
      ...(style || {})
    } : style || {}
    
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        style={baseStyle}
        onMouseEnter={(e) => {
          if (variant === 'outline') {
            e.currentTarget.style.background = primaryLight
            e.currentTarget.style.color = primary
            e.currentTarget.style.borderColor = primary
          } else if (variant === 'default') {
            e.currentTarget.style.background = primaryHover
            e.currentTarget.style.boxShadow = '0 4px 12px rgba(8, 131, 149, 0.4)'
          }
        }}
        onMouseLeave={(e) => {
          if (variant === 'outline') {
            e.currentTarget.style.background = '#ffffff'
            e.currentTarget.style.color = primary
            e.currentTarget.style.borderColor = 'rgba(8, 131, 149, 0.35)'
          } else if (variant === 'default') {
            e.currentTarget.style.background = primary
            e.currentTarget.style.boxShadow = '0 2px 8px rgba(8, 131, 149, 0.35)'
          }
        }}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
