import type { ComponentProps } from 'react'

type PaginationButtonProps = ComponentProps<'button'>

export const PaginationButton = ({ className = '', ...props }: PaginationButtonProps) => (
  <button
    type="button"
    className={`rounded-lg
                bg-purple-600
                px-4
                py-2
                text-white
                hover:bg-purple-700
                disabled:bg-slate-300 ${className}`}
    {...props}
  />
)
