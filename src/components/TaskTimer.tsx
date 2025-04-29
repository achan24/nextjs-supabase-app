import { useState, useEffect } from 'react'

interface TaskTimerProps {
  initialTime?: number // in seconds
  onTimeUpdate?: (time: number) => void
  isRunning?: boolean
  onComplete?: () => void
}

export default function TaskTimer({ 
  initialTime = 0, 
  onTimeUpdate, 
  isRunning = false,
  onComplete 
}: TaskTimerProps) {
  const [time, setTime] = useState(initialTime)
  const [isActive, setIsActive] = useState(isRunning)

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null

    if (isActive) {
      interval = setInterval(() => {
        setTime((time) => {
          const newTime = time + 1
          onTimeUpdate?.(newTime)
          return newTime
        })
      }, 1000)
    }

    return () => {
      if (interval) {
        clearInterval(interval)
      }
    }
  }, [isActive, onTimeUpdate])

  useEffect(() => {
    setIsActive(isRunning)
  }, [isRunning])

  useEffect(() => {
    if (time === 0 && isActive) {
      onComplete?.()
    }
  }, [time, isActive, onComplete])

  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const remainingSeconds = seconds % 60

    return `${hours.toString().padStart(2, '0')}:${minutes
      .toString()
      .padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`
  }

  return (
    <div className="text-2xl font-mono">
      {formatTime(time)}
    </div>
  )
} 