import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import type { DashboardSummary } from '../domain/dashboardRules'
import type { Assignment, Exam, Task } from '@/shared/types/activity'
import { PRIORITY_LABELS, Priority } from '@/shared/types/activity'

export function truncate(value: string, max: number): string {
  if (value.length <= max) return value
  return `${value.slice(0, Math.max(0, max - 1))}…`
}

export function formatDashboardDate(value: Date | string | undefined): string {
  if (!value) return 'Sem data'
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return 'Data inválida'
  return format(date, "dd 'de' MMMM, yyyy", { locale: ptBR })
}

export function formatDashboardDateShort(value: Date | string | undefined): string {
  if (!value) return '—'
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return 'Data inválida'
  return format(date, 'dd MMM', { locale: ptBR })
}

export function formatDashboardTime(value: string | undefined): string {
  if (!value) return ''
  if (!/^\d{2}:\d{2}/.test(value)) return 'Hora inválida'
  return value.slice(0, 5)
}

export function formatEstimatedHours(hours: number): string {
  if (!Number.isFinite(hours) || hours < 0) return '0 h'
  return `${hours.toFixed(1)} h`
}

export function formatPercent(value: number): string {
  if (!Number.isFinite(value)) return '0%'
  return `${Math.round(value)}%`
}

export function formatPriority(priority: Priority): string {
  return PRIORITY_LABELS[priority] ?? priority
}

export interface FormattedTask {
  id: string
  title: string
  shortTitle: string
  dueDate: Date | undefined
  dueDateLabel: string
  dueTime?: string
  priority: Priority
  priorityLabel: string
  subjectName: string
  status: Task['status']
}

export interface FormattedExam {
  id: string
  title: string
  subjectName: string
  date: Date
  dateLabel: string
  timeLabel: string
  examType: Exam['examType']
}

export interface FormattedAssignment {
  id: string
  title: string
  shortTitle: string
  subjectName: string
  dueDate: Date
  dueDateLabel: string
  assignmentType: Assignment['assignmentType']
}

export function formatDashboardData(
  summary: DashboardSummary,
  subjectNames: Map<string, string>,
): {
  tasks: FormattedTask[]
  todayTasks: FormattedTask[]
  exams: FormattedExam[]
  assignments: FormattedAssignment[]
  stats: DashboardSummary['stats']
} {
  const toFormattedTask = (task: Task): FormattedTask => ({
    id: task.id,
    title: task.title,
    shortTitle: truncate(task.title, 60),
    dueDate: task.dueDate,
    dueDateLabel: formatDashboardDate(task.dueDate),
    dueTime: task.dueTime,
    priority: task.priority,
    priorityLabel: formatPriority(task.priority),
    subjectName: truncate(
      task.subjectId ? subjectNames.get(task.subjectId) ?? 'Sem disciplina' : 'Sem disciplina',
      30,
    ),
    status: task.status,
  })

  return {
    tasks: summary.pendingTasks.map(toFormattedTask),
    todayTasks: summary.todayTasks.map(toFormattedTask),
    exams: summary.upcomingExams.map((exam) => ({
      id: exam.id,
      title: truncate(exam.title, 60),
      subjectName: truncate(
        exam.subjectId ? subjectNames.get(exam.subjectId) ?? 'Sem disciplina' : 'Sem disciplina',
        30,
      ),
      date: exam.date,
      dateLabel: formatDashboardDate(exam.date),
      timeLabel: formatDashboardTime(exam.time),
      examType: exam.examType,
    })),
    assignments: summary.upcomingAssignments.map((assignment) => ({
      id: assignment.id,
      title: assignment.title,
      shortTitle: truncate(assignment.title, 60),
      subjectName: truncate(
        assignment.subjectId ? subjectNames.get(assignment.subjectId) ?? 'Sem disciplina' : 'Sem disciplina',
        30,
      ),
      dueDate: assignment.dueDate,
      dueDateLabel: formatDashboardDate(assignment.dueDate),
      assignmentType: assignment.assignmentType,
    })),
    stats: summary.stats,
  }
}
