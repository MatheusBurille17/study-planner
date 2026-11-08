import { format, isSameDay, isSameMonth, startOfDay } from 'date-fns'
import type { Activity, Assignment, Exam, Task } from '@/shared/types/activity'
import { AssignmentStatus, Priority, TaskStatus } from '@/shared/types/activity'
import { getEventDate } from '@/features/activities/domain/rules'

export interface DashboardStats {
  completionPercent: number
  overdueCount: number
  estimatedHours: number
  priorityBreakdown: { high: number; medium: number; low: number }
  totalTasks: number
  completedTasks: number
  pendingTasks: number
}

export interface DashboardSummary {
  pendingTasks: Task[]
  totalPendingTasks: number
  todayTasks: Task[]
  todayTotal: number
  upcomingExams: Exam[]
  totalUpcomingExams: number
  upcomingAssignments: Assignment[]
  totalUpcomingAssignments: number
  stats: DashboardStats
  calendarDays: Array<{ date: string; types: string[] }>
  generatedAt: Date
}

const UPCOMING_WINDOW_DAYS = 14

function isTask(activity: Activity): activity is Task {
  return activity.type === 'task'
}

function isExam(activity: Activity): activity is Exam {
  return activity.type === 'exam'
}

function isAssignment(activity: Activity): activity is Assignment {
  return activity.type === 'assignment'
}

export function calculateCompletionPercent(tasks: Task[]): number {
  if (tasks.length === 0) return 0
  const completed = tasks.filter((task) => task.status === TaskStatus.COMPLETED).length
  return Math.round((completed / tasks.length) * 100)
}

export function countOverdue(activities: Activity[], now: Date = new Date()): number {
  return activities.filter((activity) => {
    if (isTask(activity) && activity.status === TaskStatus.COMPLETED) return false
    if (isAssignment(activity) && activity.status !== AssignmentStatus.PENDING) return false
    const date = getEventDate(activity)
    if (!date) return false
    return startOfDay(date) < startOfDay(now)
  }).length
}

export function calculateEstimatedHours(tasks: Task[]): number {
  const minutes = tasks
    .filter((task) => task.status !== TaskStatus.COMPLETED)
    .reduce((sum, task) => sum + (task.estimatedTimeMinutes ?? 0), 0)
  return Math.round((minutes / 60) * 10) / 10
}

export function calculatePriorityBreakdown(tasks: Task[]): DashboardStats['priorityBreakdown'] {
  return tasks.reduce(
    (breakdown, task) => {
      if (task.priority === Priority.HIGH) breakdown.high += 1
      else if (task.priority === Priority.LOW) breakdown.low += 1
      else breakdown.medium += 1
      return breakdown
    },
    { high: 0, medium: 0, low: 0 },
  )
}

export function getGreeting(now: Date = new Date()): string {
  const hour = now.getHours()
  if (hour >= 5 && hour < 12) return 'Bom dia'
  if (hour >= 12 && hour < 18) return 'Boa tarde'
  return 'Boa noite'
}

function sortByDate<T extends Activity>(items: T[]): T[] {
  return [...items].sort((a, b) => {
    const aDate = getEventDate(a)?.getTime() ?? Number.MAX_SAFE_INTEGER
    const bDate = getEventDate(b)?.getTime() ?? Number.MAX_SAFE_INTEGER
    return aDate - bDate
  })
}

function withinNextDays(date: Date | undefined, days: number, now: Date): boolean {
  if (!date) return false
  const start = startOfDay(now).getTime()
  const end = start + days * 24 * 60 * 60 * 1000
  const value = startOfDay(date).getTime()
  return value >= start && value <= end
}

/** Monta o resumo executivo (visão 360°) a partir de todas as atividades. */
export function buildDashboardSummary(activities: Activity[], now: Date = new Date()): DashboardSummary {
  const tasks = activities.filter(isTask)
  const pendingTasksAll = sortByDate(
    tasks.filter(
      (task) => task.status === TaskStatus.TODO || task.status === TaskStatus.IN_PROGRESS,
    ),
  )
  const examsAll = sortByDate(
    activities.filter(isExam).filter((exam) => withinNextDays(exam.date, UPCOMING_WINDOW_DAYS, now)),
  )
  const assignmentsAll = sortByDate(
    activities
      .filter(isAssignment)
      .filter(
        (assignment) =>
          assignment.status === AssignmentStatus.PENDING &&
          withinNextDays(assignment.dueDate, UPCOMING_WINDOW_DAYS, now),
      ),
  )

  const todayTasks = pendingTasksAll
    .filter((task) => task.dueDate && isSameDay(task.dueDate, now))
    .slice(0, 5)

  const calendarMap = new Map<string, Set<string>>()
  for (const activity of activities) {
    const date = getEventDate(activity)
    if (!date || !isSameMonth(date, now)) continue
    const key = format(date, 'yyyy-MM-dd')
    const types = calendarMap.get(key) ?? new Set<string>()
    types.add(String(activity.type))
    calendarMap.set(key, types)
  }

  return {
    pendingTasks: pendingTasksAll.slice(0, 5),
    totalPendingTasks: pendingTasksAll.length,
    todayTasks,
    todayTotal: pendingTasksAll.filter((task) => task.dueDate && isSameDay(task.dueDate, now)).length,
    upcomingExams: examsAll.slice(0, 5),
    totalUpcomingExams: examsAll.length,
    upcomingAssignments: assignmentsAll.slice(0, 5),
    totalUpcomingAssignments: assignmentsAll.length,
    stats: {
      completionPercent: calculateCompletionPercent(tasks),
      overdueCount: countOverdue(activities, now),
      estimatedHours: calculateEstimatedHours(tasks),
      priorityBreakdown: calculatePriorityBreakdown(tasks),
      totalTasks: tasks.length,
      completedTasks: tasks.filter((task) => task.status === TaskStatus.COMPLETED).length,
      pendingTasks: pendingTasksAll.length,
    },
    calendarDays: Array.from(calendarMap.entries()).map(([date, types]) => ({
      date,
      types: Array.from(types),
    })),
    generatedAt: now,
  }
}
