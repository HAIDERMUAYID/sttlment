import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastTitle,
  ToastViewport,
} from "@/components/ui/toast"
import { useToast } from "@/hooks/use-toast"
import { CheckCircle2, AlertCircle, Info, AlertTriangle } from "lucide-react"

const variantIcons = {
  default: Info,
  success: CheckCircle2,
  destructive: AlertCircle,
  warning: AlertTriangle,
  info: Info,
}

export function Toaster() {
  const { toasts } = useToast()

  return (
    <>
      {toasts.map(function ({ id, title, description, action, variant = 'default', ...props }) {
        const Icon = variantIcons[variant as keyof typeof variantIcons] || Info
        
        return (
          <Toast key={id} variant={variant as any} {...props} className="p-4 pr-10">
            <div className="flex items-start gap-3 flex-1 min-w-0">
              <div className="flex-shrink-0 mt-0.5">
                <Icon className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                {title && <ToastTitle>{title}</ToastTitle>}
                {description && (
                  <ToastDescription>{description}</ToastDescription>
                )}
              </div>
            </div>
            {action}
            <ToastClose />
          </Toast>
        )
      })}
      <ToastViewport />
    </>
  )
}
