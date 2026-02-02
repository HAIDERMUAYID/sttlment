import * as React from "react"
import * as ToastPrimitives from "@radix-ui/react-toast"
import { cva, type VariantProps } from "class-variance-authority"
import { X, CheckCircle2, AlertCircle, Info, AlertTriangle } from "lucide-react"
import { cn } from "@/lib/utils"

const ToastProvider = ToastPrimitives.Provider

const ToastViewport = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Viewport>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Viewport>
>(({ className, ...props }, ref) => {
  // حساب margin-right ديناميكي لتجنب Sidebar
  const [marginRight, setMarginRight] = React.useState(16)
  
  React.useEffect(() => {
    const updateMargin = () => {
      // Sidebar width: 256px عند الفتح، 72px عند الطي، 0 عند الإخفاء
      const sidebar = document.querySelector('aside[class*="fixed"]')
      if (sidebar) {
        const width = sidebar.getBoundingClientRect().width
        setMarginRight(width > 0 ? width + 16 : 16)
      } else {
        setMarginRight(16)
      }
    }
    
    updateMargin()
    const interval = setInterval(updateMargin, 500)
    const observer = new MutationObserver(updateMargin)
    
    if (document.body) {
      observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['class', 'style'] })
    }
    
    return () => {
      clearInterval(interval)
      observer.disconnect()
    }
  }, [])
  
  return (
    <ToastPrimitives.Viewport
      ref={ref}
      className={cn(
        "fixed top-4 z-[100] flex max-h-[calc(100vh-2rem)] w-full flex-col gap-2 p-0 sm:max-w-[420px]",
        className
      )}
      style={{
        pointerEvents: 'none',
        right: `${marginRight}px`,
        transition: 'right 0.3s ease',
      }}
      {...props}
    />
  )
})
ToastViewport.displayName = ToastPrimitives.Viewport.displayName

const toastVariants = cva(
  "group pointer-events-auto relative flex w-full items-start gap-3 overflow-hidden rounded-xl border shadow-2xl transition-all backdrop-blur-md data-[swipe=cancel]:translate-x-0 data-[swipe=end]:translate-x-[var(--radix-toast-swipe-end-x)] data-[swipe=move]:translate-x-[var(--radix-toast-swipe-move-x)] data-[swipe=move]:transition-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[swipe=end]:animate-out data-[state=closed]:fade-out-80 data-[state=closed]:slide-out-to-right-full data-[state=open]:slide-in-from-right-full hover:shadow-2xl",
  {
    variants: {
      variant: {
        default: "border-[rgba(2,97,116,0.3)] bg-[rgba(255,255,255,0.98)] text-[#1e293b] shadow-[0_8px_24px_rgba(2,97,116,0.15)]",
        destructive:
          "border-[rgba(239,68,68,0.4)] bg-[rgba(239,68,68,0.98)] text-white shadow-[0_8px_24px_rgba(239,68,68,0.3)]",
        success:
          "border-[rgba(34,197,94,0.4)] bg-[rgba(34,197,94,0.98)] text-white shadow-[0_8px_24px_rgba(34,197,94,0.3)]",
        warning:
          "border-[rgba(245,158,11,0.4)] bg-[rgba(245,158,11,0.98)] text-white shadow-[0_8px_24px_rgba(245,158,11,0.3)]",
        info:
          "border-[rgba(2,97,116,0.4)] bg-[rgba(2,97,116,0.98)] text-white shadow-[0_8px_24px_rgba(2,97,116,0.3)]",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

const Toast = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Root>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Root> &
    VariantProps<typeof toastVariants>
>(({ className, variant, ...props }, ref) => {
  return (
    <ToastPrimitives.Root
      ref={ref}
      className={cn(toastVariants({ variant }), className)}
      duration={5000}
      {...props}
    />
  )
})
Toast.displayName = ToastPrimitives.Root.displayName

const ToastAction = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Action>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Action>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Action
    ref={ref}
    className={cn(
      "inline-flex h-8 shrink-0 items-center justify-center rounded-md border bg-transparent px-3 text-sm font-medium ring-offset-background transition-colors hover:bg-secondary focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 group-[.destructive]:border-muted/40 group-[.destructive]:hover:border-destructive/30 group-[.destructive]:hover:bg-destructive group-[.destructive]:hover:text-white group-[.destructive]:focus:ring-destructive",
      className
    )}
    {...props}
  />
))
ToastAction.displayName = ToastPrimitives.Action.displayName

const ToastClose = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Close>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Close>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Close
    ref={ref}
    className={cn(
      "absolute left-2 right-auto top-2 rounded-lg p-1.5 opacity-60 transition-all hover:opacity-100 hover:bg-[rgba(0,0,0,0.12)] hover:scale-110 focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-offset-1 group-hover:opacity-100",
      className
    )}
    style={{
      color: 'inherit',
    }}
    toast-close=""
    {...props}
  >
    <X className="h-4 w-4" />
  </ToastPrimitives.Close>
))
ToastClose.displayName = ToastPrimitives.Close.displayName

const ToastTitle = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Title>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Title>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Title
    ref={ref}
    className={cn("text-sm font-bold leading-tight", className)}
    style={{ color: 'inherit' }}
    {...props}
  />
))
ToastTitle.displayName = ToastPrimitives.Title.displayName

const ToastDescription = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Description>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Description>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Description
    ref={ref}
    className={cn("text-sm leading-relaxed mt-1", className)}
    style={{ color: 'inherit', opacity: 0.95 }}
    {...props}
  />
))
ToastDescription.displayName = ToastPrimitives.Description.displayName

type ToastProps = React.ComponentPropsWithoutRef<typeof Toast>
type ToastActionElement = React.ReactElement<typeof ToastAction>

export {
  type ToastProps,
  type ToastActionElement,
  ToastProvider,
  ToastViewport,
  Toast,
  ToastTitle,
  ToastDescription,
  ToastClose,
  ToastAction,
}
