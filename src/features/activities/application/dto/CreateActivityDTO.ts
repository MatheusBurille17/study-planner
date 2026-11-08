import type {
  AssignmentStatus,
  AssignmentType,
  ExamType,
  Priority,
  ReminderInput,
  TaskStatus,
} from '@/shared/types/activity'

/** Entrada do caso de uso de criação. Datas aceitam Date ou string ISO. */
export interface CreateActivityDTO {
  type: 'task' | 'exam' | 'assignment'
  title?: string
  description?: string
  subjectId?: string
  dueDate?: Date | string
  dueTime?: string
  priority?: Priority
  status?: TaskStatus | AssignmentStatus
  estimatedTimeMinutes?: number
  tags?: string[]
  date?: Date | string
  time?: string
  examType?: ExamType
  content?: string[]
  location?: string
  notes?: string
  assignmentType?: AssignmentType
  criteria?: string
  reminders?: ReminderInput[]
}

export interface CreateActivityOutput {
  success: boolean
  activity?: import('@/shared/types/activity').Activity
  error?: {
    code: string
    message: string
    field?: string
  }
}
