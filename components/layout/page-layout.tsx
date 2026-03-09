'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'

export function PageLayout({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('min-h-screen flex flex-col', className)} {...props}>
      {children}
    </div>
  )
}
