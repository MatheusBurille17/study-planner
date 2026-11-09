import {
  ActivityType,
  AssignmentStatus,
  AssignmentType,
  ExamType,
  Priority,
  TaskStatus,
  type Activity as ActivityData,
  type Assignment as AssignmentData,
  type Exam as ExamData,
  type Reminder,
  type Task as TaskData,
} from '@/shared/types/activity'
import { ActivityRuleError, validateDeadline, validateMaxReminders } from './rules'
import { startOfDay } from 'date-fns'

/**
 * Entidades de domínio ricas em regras.
 *
 * Invariantes gerais:
 * - title não vazio e <= 200 caracteres
 * - userId sempre presente
 * - createdAt <= now() e updatedAt >= createdAt
 * - no máximo 3 lembretes
 */

export interface BaseActivityProps {
  id?: string
  userId: string
  title: string
  description?: string
  subjectId?: string
  createdAt?: Date
  updatedAt?: Date
  reminders?: Reminder[]
}

function createId(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `id-${Date.now()}-${Math.random().toString(36).slice(2)}`
}export abstract class Activity {
  readonly id: string
  readonly userId: string
  readonly type: ActivityType | 'task' | 'exam' | 'assignment' | 'seminar'
  readonly title: string
  readonly description?: string
  readonly subjectId?: string
  readonly createdAt: Date
  readonly updatedAt: Date
  readonly reminders: Reminder[]

  protected constructor(
    props: BaseActivityProps & { type: ActivityType | 'task' | 'exam' | 'assignment' | 'seminar' },
  ) {
    this.id = props.id ?? createId()
    this.userId = props.userId
    this.type = props.type
    this.title = props.title
    this.description = props.description
    this.subjectId = props.subjectId
    this.createdAt = props.createdAt ?? new Date()
    this.updatedAt = props.updatedAt ?? new Date()
    this.reminders = props.reminders ?? []
  }

  validateInvariants(): void {
    if (!this.title || !this.title.trim()) {
      throw new ActivityRuleError('Título é obrigatório', 'EMPTY_TITLE', 'title')
    }
    if (this.title.length > 200) {
      throw new ActivityRuleError('Título deve ter no máximo 200 caracteres', 'TITLE_TOO_LONG', 'title')
    }
    if (!this.userId) {
      throw new ActivityRuleError('Atividade deve pertencer a um usuário', 'MISSING_USER', 'userId')
    }
    if (this.createdAt.getTime() > Date.now() + 1000) {
      throw new ActivityRuleError('Data de criação inválida', 'INVALID_CREATED_AT', 'createdAt')
    }
    if (this.updatedAt.getTime() < this.createdAt.getTime()) {
      throw new ActivityRuleError('Data de atualização inválida', 'INVALID_UPDATED_AT', 'updatedAt')
    }
    validateMaxReminders(this.reminders)
  }

  abstract getDueDate(): Date | undefined

  isOverdue(now: Date = new Date()): boolean {
    const due = this.getDueDate()
    if (!due) return false
    return due.getTime() < now.getTime()
  }

  abstract toActivity(): ActivityData
}

export interface CreateTaskProps extends BaseActivityProps {
  dueDate?: Date
  dueTime?: string
  priority?: Priority
  status?: TaskStatus
  estimatedTimeMinutes?: number
  tags?: string[]
}

export class Task extends Activity {
  declare readonly type: 'task'
  readonly dueDate?: Date
  readonly dueTime?: string
  readonly priority: Priority
  readonly status: TaskStatus
  readonly estimatedTimeMinutes?: number
  readonly tags?: string[]

  constructor(props: CreateTaskProps) {
    super({ ...props, type: 'task' })
    this.dueDate = props.dueDate
    this.dueTime = props.dueTime
    this.priority = props.priority ?? Priority.MEDIUM
    this.status = props.status ?? TaskStatus.TODO
    this.estimatedTimeMinutes = props.estimatedTimeMinutes
    this.tags = props.tags
    this.validateInvariants()
  }

  static create(props: CreateTaskProps): Task {
    return new Task(props)
  }

  override validateInvariants(): void {
    super.validateInvariants()
    if (this.dueDate) validateDeadline(this.dueDate)
    if (this.estimatedTimeMinutes !== undefined) {
      if (this.estimatedTimeMinutes < 0 || this.estimatedTimeMinutes > 999) {
        throw new ActivityRuleError(
          'Tempo estimado deve estar entre 0 e 999 minutos',
          'INVALID_ESTIMATED_TIME',
          'estimatedTimeMinutes',
        )
      }
    }
    if (this.tags) {
      if (this.tags.length > 10) {
        throw new ActivityRuleError('Máximo de 10 tags', 'TOO_MANY_TAGS', 'tags')
      }
      if (new Set(this.tags).size !== this.tags.length) {
        throw new ActivityRuleError('Tags duplicadas não são permitidas', 'DUPLICATE_TAGS', 'tags')
      }
      if (this.tags.some((tag) => tag.length > 50)) {
        throw new ActivityRuleError('Cada tag deve ter no máximo 50 caracteres', 'TAG_TOO_LONG', 'tags')
      }
    }
  }

  getDueDate(): Date | undefined {
    return this.dueDate
  }

  markCompleted(): Task {
    return new Task({ ...this.toActivity(), status: TaskStatus.COMPLETED })
  }

  calculateProgressPercent(): number {
    if (this.status === TaskStatus.COMPLETED) return 100
    if (this.status === TaskStatus.IN_PROGRESS) return 50
    return 0
  }

  toActivity(): TaskData {
    return {
      id: this.id,
      userId: this.userId,
      type: 'task',
      title: this.title,
      description: this.description,
      subjectId: this.subjectId,
      dueDate: this.dueDate,
      dueTime: this.dueTime,
      priority: this.priority,
      status: this.status,
      estimatedTimeMinutes: this.estimatedTimeMinutes,
      tags: this.tags,
      reminders: this.reminders,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    }
  }
}

export interface CreateExamProps extends BaseActivityProps {
  date: Date
  time?: string
  examType: ExamType
  content?: string[]
  location?: string
  notes?: string
}

export class Exam extends Activity {
  declare readonly type: 'exam'
  readonly date: Date
  readonly time?: string
  readonly examType: ExamType
  readonly content?: string[]
  readonly location?: string
  readonly notes?: string

  constructor(props: CreateExamProps) {
    super({ ...props, type: 'exam' })
    this.date = props.date
    this.time = props.time
    this.examType = props.examType
    this.content = props.content
    this.location = props.location
    this.notes = props.notes
    this.validateInvariants()
  }

  static create(props: CreateExamProps): Exam {
    return new Exam(props)
  }

  override validateInvariants(): void {
    super.validateInvariants()
    validateDeadline(this.date)
    if (!this.subjectId) {
      throw new ActivityRuleError('Disciplina é obrigatória para provas', 'MISSING_SUBJECT', 'subjectId')
    }
    if (this.content && this.content.length > 10) {
      throw new ActivityRuleError('Máximo de 10 tópicos', 'TOO_MANY_TOPICS', 'content')
    }
    if (this.location && this.location.length > 100) {
      throw new ActivityRuleError('Local deve ter no máximo 100 caracteres', 'LOCATION_TOO_LONG', 'location')
    }
    if (this.notes && this.notes.length > 1000) {
      throw new ActivityRuleError('Observações devem ter no máximo 1000 caracteres', 'NOTES_TOO_LONG', 'notes')
    }
  }

  getDueDate(): Date {
    if (!this.time) return this.date
    const [hours, minutes] = this.time.split(':').map(Number)
    const result = new Date(this.date)
    result.setHours(hours || 0, minutes || 0, 0, 0)
    return result
  }

  getRemainingDays(now: Date = new Date()): number {
    return Math.ceil((startOfDay(this.date).getTime() - startOfDay(now).getTime()) / 86_400_000)
  }

  isOverdue(): boolean {
    return this.getRemainingDays() < 0
  }

  toActivity(): ExamData {
    return {
      id: this.id,
      userId: this.userId,
      type: 'exam',
      title: this.title,
      description: this.description,
      subjectId: this.subjectId,
      date: this.date,
      time: this.time,
      examType: this.examType,
      content: this.content,
      location: this.location,
      notes: this.notes,
      reminders: this.reminders,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    }
  }
}

export interface CreateAssignmentProps extends BaseActivityProps {
  dueDate: Date
  dueTime?: string
  assignmentType: AssignmentType
  criteria?: string
  status?: AssignmentStatus
  submittedAt?: Date
  gradedAt?: Date
}

export class Assignment extends Activity {
  declare readonly type: 'assignment'
  readonly dueDate: Date
  readonly dueTime?: string
  readonly assignmentType: AssignmentType
  readonly criteria?: string
  readonly status: AssignmentStatus
  readonly submittedAt?: Date
  readonly gradedAt?: Date

  constructor(props: CreateAssignmentProps) {
    super({ ...props, type: 'assignment' })
    this.dueDate = props.dueDate
    this.dueTime = props.dueTime
    this.assignmentType = props.assignmentType
    this.criteria = props.criteria
    this.status = props.status ?? AssignmentStatus.PENDING
    this.submittedAt = props.submittedAt
    this.gradedAt = props.gradedAt
    this.validateInvariants()
  }

  static create(props: CreateAssignmentProps): Assignment {
    return new Assignment(props)
  }

  override validateInvariants(): void {
    super.validateInvariants()
    validateDeadline(this.dueDate)
    if (!this.subjectId) {
      throw new ActivityRuleError('Disciplina é obrigatória para trabalhos', 'MISSING_SUBJECT', 'subjectId')
    }
    if (!this.description || !this.description.trim()) {
      throw new ActivityRuleError('Descrição é obrigatória', 'EMPTY_DESCRIPTION', 'description')
    }
    if (this.description.length > 3000) {
      throw new ActivityRuleError('Descrição deve ter no máximo 3000 caracteres', 'DESCRIPTION_TOO_LONG', 'description')
    }
    if (this.criteria && this.criteria.length > 2000) {
      throw new ActivityRuleError('Critérios devem ter no máximo 2000 caracteres', 'CRITERIA_TOO_LONG', 'criteria')
    }
  }

  getDueDate(): Date {
    if (!this.dueTime) return this.dueDate
    const [hours, minutes] = this.dueTime.split(':').map(Number)
    const result = new Date(this.dueDate)
    result.setHours(hours || 0, minutes || 0, 0, 0)
    return result
  }

  getDaysRemaining(now: Date = new Date()): number {
    return Math.ceil((startOfDay(this.dueDate).getTime() - startOfDay(now).getTime()) / 86_400_000)
  }

  markSubmitted(at: Date = new Date()): Assignment {
    return new Assignment({ ...this.toActivity(), status: AssignmentStatus.SUBMITTED, submittedAt: at })
  }

  markGraded(at: Date = new Date()): Assignment {
    return new Assignment({ ...this.toActivity(), status: AssignmentStatus.GRADED, gradedAt: at })
  }

  toActivity(): AssignmentData {
    return {
      id: this.id,
      userId: this.userId,
      type: 'assignment',
      title: this.title,
      description: this.description,
      subjectId: this.subjectId,
      dueDate: this.dueDate,
      dueTime: this.dueTime,
      assignmentType: this.assignmentType,
      criteria: this.criteria,
      status: this.status,
      submittedAt: this.submittedAt,
      gradedAt: this.gradedAt,
      reminders: this.reminders,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    }
  }
}
