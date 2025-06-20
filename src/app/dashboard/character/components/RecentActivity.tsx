const activities = [
  {
    id: 1,
    type: 'task',
    name: 'Morning Workout',
    timestamp: '2 hours ago',
    impact: { type: 'Health & Fitness', value: '+2 pts' }
  },
  {
    id: 2,
    type: 'skill',
    name: 'Completed React Tutorial',
    timestamp: '4 hours ago',
    impact: { type: 'Programming', value: '+25 XP' }
  },
  {
    id: 3,
    type: 'task',
    name: 'Team Meeting',
    timestamp: '5 hours ago',
    impact: { type: 'Relationships', value: '+1 pt' }
  }
]

export default function RecentActivity() {
  return (
    <div className="space-y-4">
      {activities.map((activity) => (
        <div key={activity.id} className="flex justify-between items-start">
          <div>
            <p className="font-medium">{activity.name}</p>
            <p className="text-sm text-gray-500">{activity.timestamp}</p>
          </div>
          <div className="text-right">
            <p className="text-sm font-medium">{activity.impact.value}</p>
            <p className="text-xs text-gray-500">{activity.impact.type}</p>
          </div>
        </div>
      ))}
    </div>
  )
} 