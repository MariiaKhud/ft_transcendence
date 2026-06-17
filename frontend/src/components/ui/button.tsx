import * as React from 'react'                                      // Importing React for creating React components and using JSX syntax
import { Slot } from '@radix-ui/react-slot'                         // Importing Slot from @radix-ui/react-slot, which is a utility component for rendering children in a flexible way, allowing for composition and customization of components
import { cva, type VariantProps } from 'class-variance-authority'   // Importing cva and VariantProps from class-variance-authority, which is a utility for creating variant-based class name generators, allowing for easy management of CSS classes based on component variants

import { cn } from '@/lib/utils'                                    // Importing the cn function from the utils module, which is a utility function for merging class names conditionally, often used in conjunction with the cva function to generate class names based on component variants and additional classes passed as props

/**
 * @brief This file defines a Button component that can be used throughout the React application. The Button component is styled using Tailwind CSS classes
 * and supports different variants and sizes through the use of the class-variance-authority (cva) utility. The component also allows for rendering as a different
 * element (e.g., a link) using the Slot component from @radix-ui/react-slot. The cn function is used to merge class names conditionally based on the provided
 * variants and additional class names passed as props.
 * @function Button
 * @param {object} props - The props for the Button component, including variant, size, className, and asChild.
 * @returns {JSX.Element} The rendered Button component with the appropriate styles and behavior based on the provided props.
 */
const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'bg-slate-900 text-white hover:bg-slate-800',
        outline: 'border border-slate-300 bg-white text-slate-900 hover:bg-slate-100',
      },
      size: {
        default: 'h-9 px-4 py-2',
        sm: 'h-8 rounded-md px-3 text-xs',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
)

/**
 * @brief The Button component is a reusable UI component that renders a button element with different styles based on the provided variant and size props. It uses the
 * class-variance-authority (cva) utility to generate class names based on the specified variants and sizes, allowing for consistent styling across the application. The
 * component also supports rendering as a different element (e.g., a link) using the Slot component from @radix-ui/react-slot, providing flexibility in how the button
 * can be used in different contexts. The cn function is used to merge class names conditionally, ensuring that the appropriate styles are applied based on the provided props.
 * @function Button
 * @param {object} props - The props for the Button component, including variant, size, className, and asChild.
 * @returns {JSX.Element} The rendered Button component with the appropriate styles and behavior based on the provided props. 
 */
const Button = ({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<'button'> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) => {
  const Comp = asChild ? Slot : 'button'

  return <Comp className={cn(buttonVariants({ variant, size, className }))} {...props} />
}

export { Button, buttonVariants }
