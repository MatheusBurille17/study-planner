import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/shared/utils/classNames'

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'bg-primary text-white shadow-soft hover:bg-primary-700',
        secondary: 'bg-primary-100 text-primary-800 hover:bg-primary-200',
        outline: 'border border-line bg-surface text-ink hover:bg-primary-50',
        ghost: 'text-ink hover:bg-primary-50',
        soft: 'bg-primary-50 text-primary-700 hover:bg-primary-100',
        destructive: 'bg-[#ef4444] text-white hover:bg-[#dc2626]',
        link: 'text-primary underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-11 px-5 py-2',
        sm: 'h-9 px-4 text-xs',
        lg: 'h-12 px-7 text-base',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, type = 'button', ...props }, ref) => (
    <button ref={ref} type={type} className={cn(buttonVariants({ variant, size }), className)} {...props} />
  ),
)
Button.displayName = 'Button'

export { Button, buttonVariants }
