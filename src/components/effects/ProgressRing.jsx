import { motion } from 'framer-motion'

export function ProgressRing({
  progress = 0,
  size = 80,
  strokeWidth = 6,
  color = '#fbbf24',
  bgColor = 'rgba(255, 255, 255, 0.1)',
  children,
  className = '',
  showPercentage = false,
  animated = true
}) {
  const radius = (size - strokeWidth) / 2
  const circumference = radius * 2 * Math.PI
  const offset = circumference - (progress / 100) * circumference

  return (
    <div className={`relative inline-flex items-center justify-center ${className}`}>
      <svg
        width={size}
        height={size}
        className="progress-ring"
      >
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={bgColor}
          strokeWidth={strokeWidth}
        />

        {/* Progress circle */}
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={animated ? { strokeDashoffset: circumference } : { strokeDashoffset: offset }}
          animate={{ strokeDashoffset: offset }}
          transition={{
            duration: animated ? 1.5 : 0,
            ease: [0.16, 1, 0.3, 1]
          }}
          className="progress-ring-circle"
        />
      </svg>

      {/* Center content */}
      <div className="absolute inset-0 flex items-center justify-center">
        {children || (showPercentage && (
          <span className="text-sm font-semibold text-neutral-200">
            {Math.round(progress)}%
          </span>
        ))}
      </div>
    </div>
  )
}

// Mini progress ring for inline use
export function MiniProgressRing({
  progress = 0,
  size = 24,
  strokeWidth = 3,
  color = '#22c55e',
  className = ''
}) {
  const radius = (size - strokeWidth) / 2
  const circumference = radius * 2 * Math.PI
  const offset = circumference - (progress / 100) * circumference

  return (
    <svg
      width={size}
      height={size}
      className={`progress-ring ${className}`}
    >
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="rgba(255, 255, 255, 0.1)"
        strokeWidth={strokeWidth}
      />
      <motion.circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeDasharray={circumference}
        initial={{ strokeDashoffset: circumference }}
        animate={{ strokeDashoffset: offset }}
        transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
      />
    </svg>
  )
}

// Progress bar with animation
export function ProgressBar({
  progress = 0,
  height = 6,
  color = '#fbbf24',
  bgColor = 'rgba(255, 255, 255, 0.1)',
  gradient = null,
  className = '',
  showLabel = false,
  animated = true
}) {
  const gradientStyle = gradient
    ? { background: `linear-gradient(90deg, ${gradient[0]}, ${gradient[1]})` }
    : { backgroundColor: color }

  return (
    <div className={`w-full ${className}`}>
      <div
        className="w-full rounded-full overflow-hidden"
        style={{ height, backgroundColor: bgColor }}
      >
        <motion.div
          className="h-full rounded-full"
          style={gradientStyle}
          initial={animated ? { width: 0 } : { width: `${progress}%` }}
          animate={{ width: `${progress}%` }}
          transition={{
            duration: animated ? 1 : 0,
            ease: [0.16, 1, 0.3, 1]
          }}
        />
      </div>
      {showLabel && (
        <div className="flex justify-between mt-1">
          <span className="text-xs text-neutral-500">{Math.round(progress)}%</span>
        </div>
      )}
    </div>
  )
}
