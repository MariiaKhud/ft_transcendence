export function PlusIcon() {
  return (
    <svg className="w-4 h-4"
         fill="none"
         stroke="currentColor"
         viewBox="0 0 24 24">

      <path strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 4v16m8-8H4" />
    </svg>
  )
}

export function ClockIcon() {
  return (
    <svg className="w-4 h-4"
         fill="none"
         stroke="currentColor"
         viewBox="0 0 24 24">

      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  )
}

export function CheckIcon() {
  return (
    <svg className="w-4 h-4"
         fill="none"
         stroke="currentColor"
         viewBox="0 0 24 24">

      <path strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M5 13l4 4L19 7" />
    </svg>
  )
}

export function Spinner() {
  return (
    <svg className="w-4 h-4 animate-spin"
         fill="none"
         viewBox="0 0 24 24">

      <circle className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4" />

      <path className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8v8H4z" />
    </svg>
  )
}

export function XIcon() {
  return (
    <svg className="h-4 w-4"
         fill="none"
         viewBox="0 0 24 24"
         stroke="currentColor">

      <path strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M6 6l12 12M18 6L6 18" />
    </svg>
  )
}
