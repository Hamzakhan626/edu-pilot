/* eslint-disable @typescript-eslint/no-unused-vars */
"use client"

import * as React from "react"
import type { VariantProps } from "class-variance-authority"
import { cva } from "class-variance-authority"

import { toast as sonnerToast } from "sonner"

const toastVariants = cva(
  "group pointer-events-auto relative flex w-full items-center justify-between space-x-4 overflow-hidden rounded-lg border p-6 pr-8 shadow-lg transition-all data-[swipe=cancel]:translate-x-0 data-[swipe=end]:translate-x-[var(--radix-toast-swipe-end-x)] data-[swipe=move]:translate-x-[var(--radix-toast-swipe-move-x)] data-[swipe=move]:transition-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[swipe=end]:animate-out data-[state=closed]:fade-out-80 data-[state=closed]:slide-out-to-right-full data-[state=open]:slide-in-from-top-full data-[state=open]:sm:slide-in-from-bottom-full",
  {
    variants: {
      variant: {
        default: "border bg-background text-foreground",
        destructive:
          "destructive group border-destructive bg-destructive text-destructive-foreground",
        success: "border-green-600/30 bg-green-950/60 text-green-100",
        warning: "border-amber-600/30 bg-amber-950/60 text-amber-100",
        info: "border-blue-600/30 bg-blue-950/60 text-blue-100",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

type ToastProps = React.HTMLAttributes<HTMLDivElement> &
  VariantProps<typeof toastVariants> & {
    title?: React.ReactNode
    description?: React.ReactNode
    action?: React.ReactNode
  }

const Toaster = () => {
  return (
    <>
      {/* Sonner handles everything — we just need to mount it once */}
    </>
  )
}

type Toast = Omit<ToastProps, "id">

type ToasterToast = Toast & {
  id: string | number
  title?: React.ReactNode
  description?: React.ReactNode
  action?: React.ReactNode
}

const useToast = () => {
  const toast = (props: Toast) => {
    const { variant = "default", ...rest } = props

    return sonnerToast.custom(
      (id) => (
        <div
          className={toastVariants({ variant })}
          data-state="open"
          data-variant={variant}
        >
          <div className="grid gap-1">
            {props.title && (
              <div className="text-sm font-semibold">{props.title}</div>
            )}
            {props.description && (
              <div className="text-sm opacity-90">{props.description}</div>
            )}
          </div>
          {props.action}
          <button
            onClick={() => sonnerToast.dismiss(id)}
            className="absolute right-2 top-2 rounded-md p-1 text-foreground/50 opacity-70 transition-opacity hover:text-foreground hover:opacity-100 focus:opacity-100 focus:outline-none focus:ring-2 group-hover:opacity-100 group-[.destructive]:text-red-300 group-[.destructive]:hover:text-red-50 group-[.destructive]:focus:ring-red-400 group-[.destructive]:focus:ring-offset-red-600"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M18 6 6 18" />
              <path d="m6 6 12 12" />
            </svg>
            <span className="sr-only">Close</span>
          </button>
        </div>
      ),
      {
        duration: variant === "destructive" ? 5000 : 4000,
        ...rest,
      }
    )
  }

  return {
    toast,
    dismiss: sonnerToast.dismiss,
    // You can also expose other sonner methods if needed
    success: (msg: string) => toast({ title: "Success", description: msg, variant: "success" }),
    error: (msg: string) => toast({ title: "Error", description: msg, variant: "destructive" }),
    warning: (msg: string) => toast({ title: "Warning", description: msg, variant: "warning" }),
    info: (msg: string) => toast({ title: "Info", description: msg, variant: "info" }),
  }
}

export { useToast, toastVariants, Toaster }