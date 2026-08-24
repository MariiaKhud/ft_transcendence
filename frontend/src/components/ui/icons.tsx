export function SearchIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className}
         fill="none"
         stroke="currentColor"
         viewBox="0 0 24 24">

      <path strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-4.35-4.35M17 10a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
  )
}

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

export function PencilIcon() {
  return (
    <svg className="w-4 h-4"
         fill="none"
         stroke="currentColor"
         viewBox="0 0 24 24">

      <path strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
    </svg>
  )
}

export function TrashIcon() {
  return (
    <svg className="w-4 h-4"
         fill="none"
         stroke="currentColor"
         viewBox="0 0 24 24">

      <path strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M9.5 7V4.5A1.5 1.5 0 0111 3h2a1.5 1.5 0 011.5 1.5V7M4 7h16" />
    </svg>
  )
}

export function BellIcon() {
  return (
    <svg className="w-6 h-6"
         fill="none"
         stroke="currentColor"
         viewBox="0 0 24 24">

      <path strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
    </svg>
  );
}

export function NotificationsSkeleton() {
  return (
    <ul>
      {[1, 2, 3].map((i) => (
        <li key={i} className="px-4
                               py-3
                               border-b
                               border-gray-50
                               flex
                               gap-3">
          <div className="w-8
                          h-8
                          rounded-full
                          bg-gray-200
                          animate-pulse
                          flex-shrink-0" />
          <div className="flex-1 space-y-2 py-1">
            <div className="h-3 bg-gray-200 rounded animate-pulse w-3/4" />
            <div className="h-3 bg-gray-200 rounded animate-pulse w-1/2" />
          </div>
        </li>
      ))}
    </ul>
  );
}

export function MessageIcon() {
  return (
    <svg className="h-4 w-4"
         fill="none"
         stroke="currentColor"
         viewBox="0 0 24 24">
      <path strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
        d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
    </svg>
  )
}

export function UserPlusIcon({ className = 'h-12 w-12' }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.75}
        d="M15 20a6 6 0 00-12 0m6-8a4 4 0 100-8 4 4 0 000 8zm8-3v6m-3-3h6"
      />
    </svg>
  )
}

export function BackIcon() {
  return (
    <svg className="h-5 w-5"
         fill="none"
         stroke="currentColor"
         viewBox="0 0 24 24">

      <path strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 19l-7-7 7-7" />
    </svg>
  )
}
