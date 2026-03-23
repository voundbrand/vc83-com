"use client"

import { createContext, useContext, useState, type HTMLAttributes, type ReactNode } from "react"
import { cn } from "@/lib/utils"

interface TabsContextType {
  value: string
  onValueChange: (value: string) => void
}

const TabsContext = createContext<TabsContextType | null>(null)

function useTabs() {
  const ctx = useContext(TabsContext)
  if (!ctx) throw new Error("Tabs components must be used within <Tabs>")
  return ctx
}

interface TabsProps extends HTMLAttributes<HTMLDivElement> {
  defaultValue: string
  children: ReactNode
}

function Tabs({ defaultValue, className, children, ...props }: TabsProps) {
  const [value, setValue] = useState(defaultValue)
  return (
    <TabsContext.Provider value={{ value, onValueChange: setValue }}>
      <div className={cn(className)} {...props}>
        {children}
      </div>
    </TabsContext.Provider>
  )
}

function TabsList({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "inline-flex h-10 items-center justify-center rounded-md bg-muted p-1 text-muted-foreground",
        className
      )}
      role="tablist"
      {...props}
    />
  )
}

interface TabsTriggerProps extends HTMLAttributes<HTMLButtonElement> {
  value: string
}

function TabsTrigger({ value, className, ...props }: TabsTriggerProps) {
  const { value: selected, onValueChange } = useTabs()
  const isActive = selected === value

  return (
    <button
      role="tab"
      aria-selected={isActive}
      className={cn(
        "inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        isActive
          ? "bg-background text-foreground shadow-sm"
          : "hover:bg-background/50 hover:text-foreground",
        className
      )}
      onClick={() => onValueChange(value)}
      {...props}
    />
  )
}

interface TabsContentProps extends HTMLAttributes<HTMLDivElement> {
  value: string
}

function TabsContent({ value, className, ...props }: TabsContentProps) {
  const { value: selected } = useTabs()
  if (selected !== value) return null

  return (
    <div
      role="tabpanel"
      className={cn(
        "mt-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        className
      )}
      {...props}
    />
  )
}

export { Tabs, TabsList, TabsTrigger, TabsContent }
