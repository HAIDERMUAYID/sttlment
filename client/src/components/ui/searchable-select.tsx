import * as React from "react"
import { Check, ChevronsUpDown, Search } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"

interface SearchableSelectProps<T> {
  value: string
  onChange: (value: string) => void
  options: T[]
  getOptionLabel: (option: T) => string
  getOptionValue: (option: T) => string
  placeholder?: string
  searchPlaceholder?: string
  className?: string
  disabled?: boolean
}

export function SearchableSelect<T>({
  value,
  onChange,
  options,
  getOptionLabel,
  getOptionValue,
  placeholder = "اختر...",
  searchPlaceholder = "ابحث...",
  className,
  disabled,
}: SearchableSelectProps<T>) {
  const [open, setOpen] = React.useState(false)
  const [search, setSearch] = React.useState("")

  const filteredOptions = React.useMemo(() => {
    if (!search) return options
    const searchLower = search.toLowerCase()
    return options.filter((option) =>
      getOptionLabel(option).toLowerCase().includes(searchLower)
    )
  }, [options, search, getOptionLabel])

  const selectedOption = options.find(
    (option) => getOptionValue(option) === value
  )

  return (
    <>
      <Button
        type="button"
        variant="outline"
        role="combobox"
        aria-expanded={open}
        className={cn("w-full justify-between", className)}
        onClick={() => setOpen(true)}
        disabled={disabled}
      >
        {selectedOption ? getOptionLabel(selectedOption) : placeholder}
        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[425px] select-modal-formal ds-popover">
          <DialogHeader>
            <DialogTitle className="text-slate-800 font-bold text-xl">اختر من القائمة</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#068294]" />
              <Input
                placeholder={searchPlaceholder}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pr-9 bg-white border-slate-200 text-slate-800 placeholder:text-slate-500 focus:ring-[#068294]/30 focus:border-[#068294]"
              />
            </div>
            <div className="max-h-[300px] overflow-y-auto space-y-1 scrollbar-formal">
              {filteredOptions.length === 0 ? (
                <div className="text-center py-8 text-slate-600 font-medium">
                  لا توجد نتائج
                </div>
              ) : (
                filteredOptions.map((option) => {
                  const optionValue = getOptionValue(option)
                  const isSelected = value === optionValue
                  return (
                    <button
                      key={optionValue}
                      type="button"
                      role="option"
                      aria-selected={isSelected}
                      onClick={() => {
                        onChange(optionValue)
                        setOpen(false)
                        setSearch("")
                      }}
                      className={cn(
                        "ds-option w-full text-right flex items-center justify-between px-3 py-2.5 rounded-lg transition-colors",
                        isSelected
                          ? "bg-[#EBF4F6] text-[#026174] font-semibold"
                          : "bg-transparent text-slate-800"
                      )}
                    >
                      <span>{getOptionLabel(option)}</span>
                      {isSelected && (
                        <Check className="h-4 w-4 text-[#068294]" />
                      )}
                    </button>
                  )
                })
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
