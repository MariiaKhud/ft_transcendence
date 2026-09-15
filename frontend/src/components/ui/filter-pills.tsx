import type { ReactNode } from 'react'

type FilterPillsProps<T extends string> = {
  options: readonly T[]
  value: T
  onChange: (value: T) => void
  getLabel: (value: T) => ReactNode
}

export const FilterPills = <T extends string>({ options, value, onChange, getLabel }: FilterPillsProps<T>) => (
  <div className="flex flex-wrap gap-2">
    {options.map((option) => {
      const selected = value === option

      return (
        <button
          key={option}
          type="button"
          onClick={() => onChange(option)}
          className={`rounded-full
                      border
                      px-4
                      py-1.5
                      text-sm
                      font-medium
                      transition-colors ${
            selected
              ? 'border-purple-600 bg-purple-600 text-white'
              : 'border-slate-300 bg-white text-slate-700 hover:border-purple-300 hover:bg-purple-50'
          }`}
        >
          {getLabel(option)}
        </button>
      )
    })}
  </div>
)
