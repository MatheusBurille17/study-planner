/**
 * Tipos centrais de atividades acadêmicas.
 *
 * Invariantes do domínio:
 * - title nunca é vazio (1..200 caracteres)
 * - createdAt <= now() e updatedAt >= createdAt
 * - prazos (dueDate/date) nunca estão no passado na criação
 * - no máximo 3 lembretes por atividade
 */

export enum Priority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
}

export enum TaskStatus {
  TODO = 'TODO',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
}

export enum ExamType {
  WRITTEN = 'WRITTEN',
  ORAL = 'ORAL',
  PRACTICAL = 'PRACTICAL',
}

export enum AssignmentType {
  WRITTEN = 'WRITTEN',
  PRESENTATION = 'PRESENTATION',
  PROJECT = 'PROJECT',
}

export enum AssignmentStatus {
  PENDING = 'PENDING',
  SUBMITTED = 'SUBMITTED',
  GRADED = 'GRADED',
}

export enum ActivityType {
  TASK = 'task',
  EXAM = 'exam',
  ASSIGNMENT = 'assignment',
  SEMINAR = 'seminar',
}

export enum ReminderType {
  ON_DAY = 'ON_DAY',
  ONE_HOUR_BEFORE = 'ONE_HOUR_BEFORE',
  TWO_HOURS_BEFORE = 'TWO_HOURS_BEFORE',
  THREE_HOURS_BEFORE = 'THREE_HOURS_BEFORE',
  ONE_DAY_BEFORE = 'ONE_DAY_BEFORE',
  TWO_DAYS_BEFORE = 'TWO_DAYS_BEFORE',
  CUSTOM = 'CUSTOM',
}

export type ReminderUnit = 'MINUTES' | 'HOURS' | 'DAYS'

export interface ReminderOffset {
  value: number
  unit: ReminderUnit
  inMinutes?: number
}

export interface ReminderInput {
  reminderType: ReminderType
  reminderTime: string
  reminderOffset?: ReminderOffset
}

export interface Reminder extends ReminderInput {
  id: string
  activityId: string
  userId: string
  reminderOffsetMinutes: number
  reminderTimestamp: Date
  isActive: boolean
  wasFired?: boolean
  firedAt?: Date
  createdAt: Date
  updatedAt: Date
}

export interface ActivityBase {
  id: string
  userId: string
  type: ActivityType | 'task' | 'exam' | 'assignment' | 'seminar'
  title: string
  description?: string
  subjectId?: string
  createdAt: Date
  updatedAt: Date
  reminders?: Reminder[]
  synced?: boolean
  isDeleted?: boolean
  deletedAt?: Date
}

export interface Task extends ActivityBase {
  type: 'task'
  dueDate?: Date
  dueTime?: string
  priority: Priority
  status: TaskStatus
  estimatedTimeMinutes?: number
  tags?: string[]
}

export interface Exam extends ActivityBase {
  type: 'exam'
  date: Date
  time?: string
  examType: ExamType
  content?: string[]
  location?: string
  notes?: string
}

export interface Assignment extends ActivityBase {
  type: 'assignment'
  dueDate: Date
  dueTime?: string
  assignmentType: AssignmentType
  criteria?: string
  status: AssignmentStatus
  submittedAt?: Date
  gradedAt?: Date
}

/** Seminário é suportado como variação de trabalho/apresentação. */
export interface Seminar extends ActivityBase {
  type: 'seminar'
  date: Date
  time?: string
  topic?: string
  location?: string
  format?: 'PRESENCIAL' | 'ONLINE'
  responsible?: string
}

export type Activity = Task | Exam | Assignment | Seminar

export interface CreateActivityResult {
  success: boolean
  activity?: Activity
  error?: {
    code: string
    message: string
    field?: string
    serverData?: Activity
    clientData?: Partial<Activity>
  }
}

export const ACTIVITY_TYPE_LABELS: Record<string, string> = {
  task: 'Tarefa',
  exam: 'Prova',
  assignment: 'Trabalho',
  seminar: 'Seminário',
}

export const PRIORITY_LABELS: Record<Priority, string> = {
  [Priority.LOW]: 'Baixa',
  [Priority.MEDIUM]: 'Média',
  [Priority.HIGH]: 'Alta',
}

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  [TaskStatus.TODO]: 'A fazer',
  [TaskStatus.IN_PROGRESS]: 'Em progresso',
  [TaskStatus.COMPLETED]: 'Concluída',
}

export const EXAM_TYPE_LABELS: Record<ExamType, string> = {
  [ExamType.WRITTEN]: 'Escrita',
  [ExamType.ORAL]: 'Oral',
  [ExamType.PRACTICAL]: 'Prática',
}

export const ASSIGNMENT_TYPE_LABELS: Record<AssignmentType, string> = {
  [AssignmentType.WRITTEN]: 'Trabalho escrito',
  [AssignmentType.PRESENTATION]: 'Apresentação',
  [AssignmentType.PROJECT]: 'Projeto',
}

export const ASSIGNMENT_STATUS_LABELS: Record<AssignmentStatus, string> = {
  [AssignmentStatus.PENDING]: 'Pendente',
  [AssignmentStatus.SUBMITTED]: 'Entregue',
  [AssignmentStatus.GRADED]: 'Avaliado',
}

export const REMINDER_TYPE_LABELS: Record<ReminderType, string> = {
  [ReminderType.ON_DAY]: 'No dia do evento',
  [ReminderType.ONE_HOUR_BEFORE]: '1 hora antes',
  [ReminderType.TWO_HOURS_BEFORE]: '2 horas antes',
  [ReminderType.THREE_HOURS_BEFORE]: '3 horas antes',
  [ReminderType.ONE_DAY_BEFORE]: '1 dia antes',
  [ReminderType.TWO_DAYS_BEFORE]: '2 dias antes',
  [ReminderType.CUSTOM]: 'Personalizado',
}

/** Mapa de cor pastel por tipo, usado em badges, cards e calendário. */
export const ACTIVITY_COLORS: Record<string, { badge: string; dot: string; soft: string; text: string }> = {
  task: { badge: 'bg-sky/60 text-[#315a7d]', dot: 'bg-[#6fa8d8]', soft: 'bg-sky/30', text: 'text-[#315a7d]' },
  exam: { badge: 'bg-rose/60 text-[#8a3d52]', dot: 'bg-[#d97b93]', soft: 'bg-rose/30', text: 'text-[#8a3d52]' },
  assignment: { badge: 'bg-sage/60 text-[#3c6b4d]', dot: 'bg-[#78b48c]', soft: 'bg-sage/30', text: 'text-[#3c6b4d]' },
  seminar: { badge: 'bg-butter/70 text-[#7a6422]', dot: 'bg-[#d9bf62]', soft: 'bg-butter/30', text: 'text-[#7a6422]' },
}
