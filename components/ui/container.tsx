'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'

export interface ContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: 'main' | 'wide' | 'narrow' | 'content'
}

const Container = React.forwardRef<HTMLDivElement, ContainerProps>(
  ({ className, size = 'main', ...props }, ref) => {
    const maxWidthMap = {
      main: 'max-w-[var(--container-main)]',
      wide: 'max-w-[var(--container-wide)]',
      narrow: 'max-w-[var(--container-narrow)]',
      content: 'max-w-[var(--container-content)]',
    }
    return (
      <div
        ref={ref}
        className={cn('mx-auto w-full px-4 sm:px-6 lg:px-8', maxWidthMap[size], className)}
        {...props}
      />
    )
  }
)
Container.displayName = 'Container'

export { Container }
