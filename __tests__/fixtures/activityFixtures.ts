import { addDays } from 'date-fns'
import {
  AssignmentStatus,
  AssignmentType,
  ExamType,
  Priority,
  ReminderType,
  TaskStatus,
  type Assignment,
  type Exam,
  type Reminder,
  type Task,
} from '@/shared/types/activity'

export function taskFixture(overrides: Partial<Task> = {}): Task {
  return {
    id: crypto.randomUUID(),
    userId: 'user-1',
    type: 'task',
    title: 'Revisar cálculo',
    description: 'Lista 5',
    subjectId: undefined,
    dueDate: addDays(new Date(), 3),
    dueTime: '18:00',
    priority: Priority.HIGH,
    status: TaskStatus.TODO,
    estimatedTimeMinutes: 60,
    tags: ['revisão'],
    reminders: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } as Task
}

export function examFixture(overrides: Partial<Exam> = {}): Exam {
  return {
    id: crypto.randomUUID(),
    userId: 'user-1',
    type: 'exam',
    title: 'Prova de Anatomia',
    subjectId: crypto.randomUUID(),
    date: addDays(new Date(), 5),
    time: '10:00',
    examType: ExamType.WRITTEN,
    content: ['Sistema nervoso'],
    location: 'Sala 204',
    reminders: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } as Exam
}

export function assignmentFixture(overrides: Partial<Assignment> = {}): Assignment {
  return {
    id: crypto.randomUUID(),
    userId: 'user-1',
    type: 'assignment',
    title: 'Relatório',
    description: 'Relatório de campo',
    subjectId: crypto.randomUUID(),
    dueDate: addDays(new Date(), 7),
    dueTime: '23:59',
    assignmentType: AssignmentType.PROJECT,
    criteria: 'ABNT',
    status: AssignmentStatus.PENDING,
    reminders: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } as Assignment
}

export function reminderFixture(overrides: Partial<Reminder> = {}): Reminder {
  return {
    id: crypto.randomUUID(),
    activityId: 'activity-1',
    userId: 'user-1',
    reminderType: ReminderType.ONE_DAY_BEFORE,
    reminderTime: '09:00',
    reminderOffsetMinutes: 1440,
    reminderTimestamp: addDays(new Date(), 2),
    isActive: true,
    wasFired: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }
}
