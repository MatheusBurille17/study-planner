import type { Activity, AssignmentStatus, Priority, TaskStatus } from './activity'

export type CalendarViewMode = 'month' | 'week' | 'day'
export type CalendarUrgency = 'critical' | 'high' | 'medium' | 'low'

export interface CalendarFilters {
  types?: Array<'task' | 'exam' | 'assignment'>
  subjectId?: string
}

export interface CalendarActivity {
  id: string
  title: string
  type: Activity['type']
  date: Date
  time?: string
  subjectId?: string
  subjectName: string
  subjectColor?: string
  priority?: Priority
  status?: TaskStatus | AssignmentStatus | string
  urgency: CalendarUrgency
  isOverdue: boolean
  completed: boolean
  location?: string
  description?: string
}

export interface CalendarResponse {
  view: CalendarViewMode
  rangeStart: string
  rangeEnd: string
  activities: CalendarActivity[]
  subjects: Array<{ id: string; name: string; color?: string }>
  generatedAt: string
}
