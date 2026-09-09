import { getRankFrameClass } from '@/lib/rank-frame'

interface UserAvatarProps {
  avatarUrl: string | null
  username: string
  size?: 'small' | 'medium'
  /** Leaderboard rank (1-3) to draw a gold/silver/bronze frame around the avatar. */
  rank?: number
}

export function UserAvatar({
  avatarUrl,
  username,
  size = 'medium',
  rank,
}: UserAvatarProps) {
  const sizeClasses = {
    small: {
      avatar: 'h-7 w-7',
      text: 'text-xs',
    },
    medium: {
      avatar: 'h-10 w-10',
      text: 'text-sm',
    },
  }

  const classes = sizeClasses[size]
  const frameClass = getRankFrameClass(rank, size === 'small' ? 'thin' : 'thick')
  const colors = [
    'from-purple-400    to-pink-400',
    'from-blue-400      to-cyan-400',
    'from-emerald-400   to-teal-400',
    'from-orange-400    to-red-400',
    'from-fuchsia-400   to-purple-400',
  ]
  const gradient = colors[username.charCodeAt(0) % colors.length]

  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={username}
        className={`${classes.avatar}
                   rounded-full
                   object-cover
                   ${frameClass}`}
      />
    )
  }

  return (
    <div className={`${classes.avatar}
                     rounded-full
                     bg-gradient-to-br
                     ${gradient}
                     flex items-center
                     justify-center
                     ${classes.text}
                     font-bold
                     text-white
                     ${frameClass}`}>
      {username[0].toUpperCase()}
    </div>
  )
}
