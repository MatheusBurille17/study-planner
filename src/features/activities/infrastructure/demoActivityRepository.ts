import type { Activity } from '@/shared/types/activity'
import type { ActivityFilter } from '@/shared/types/notification'
import type { CreateSubjectInput, Subject } from '@/shared/types/subject'
import type { ActivityRepository, SubjectRepository } from '../domain/repository'
import { mutateDemoDatabase, readDemoDatabase } from '@/shared/lib/demo/store'
import { deserializeActivity, serializeActivity } from './mappers/activityMapper'
import { filterActivities } from '../domain/filters'
import { invalidateDashboardCache } from '@/features/dashboard/application/dashboardCache'

function deserializeRows(rows: Record<string, unknown>[]): Activity[] {
  return rows.map(deserializeActivity)
}

/** Repositório local (JSON) para funcionar sem Supabase configurado. */
export class DemoActivityRepository implements ActivityRepository {
  async save(activity: Activity): Promise<Activity> {
    const row = serializeActivity(activity)
    await mutateDemoDatabase((db) => {
      db.activities.push(row)
    })
    invalidateDashboardCache(activity.userId)
    return activity
  }

  async getById(id: string, userId: string): Promise<Activity | null> {
    const db = await readDemoDatabase()
    const row = db.activities.find((activity) => activity.id === id && activity.userId === userId)
    return row ? deserializeActivity(row) : null
  }

  async getByUserId(userId: string, filter?: ActivityFilter): Promise<Activity[]> {
    const db = await readDemoDatabase()
    const rows = db.activities.filter(
      (activity) => activity.userId === userId && !activity.isDeleted,
    )
    const filtered = filterActivities(deserializeRows(rows), filter)
    const offset = Math.max(filter?.offset ?? 0, 0)
    const limit = filter?.limit ?? filtered.length
    return filtered.slice(offset, offset + limit)
  }

  async update(activity: Activity): Promise<Activity> {
    const row = serializeActivity(activity)
    await mutateDemoDatabase((db) => {
      const index = db.activities.findIndex(
        (candidate) => candidate.id === activity.id && candidate.userId === activity.userId,
      )
      if (index === -1) throw new Error('Atividade não encontrada')
      db.activities[index] = row
    })
    invalidateDashboardCache(activity.userId)
    return activity
  }

  async delete(id: string, userId: string): Promise<void> {
    await this.softDelete(id, userId)
  }

  async softDelete(id: string, userId: string): Promise<void> {
    await mutateDemoDatabase((db) => {
      const row = db.activities.find((activity) => activity.id === id && activity.userId === userId)
      if (!row) return
      row.isDeleted = true
      row.deletedAt = new Date().toISOString()
      row.updatedAt = new Date().toISOString()
    })
    invalidateDashboardCache(userId)
  }

  async restore(id: string, userId: string): Promise<Activity> {
    const restored = await mutateDemoDatabase((db) => {
      const row = db.activities.find((activity) => activity.id === id && activity.userId === userId)
      if (!row) throw new Error('Atividade não encontrada')
      row.isDeleted = false
      row.deletedAt = undefined
      row.updatedAt = new Date().toISOString()
      return row
    })
    invalidateDashboardCache(userId)
    return deserializeActivity(restored)
  }

  async getDeleted(userId: string): Promise<Activity[]> {
    const db = await readDemoDatabase()
    return deserializeRows(
      db.activities.filter((activity) => activity.userId === userId && activity.isDeleted),
    )
  }

  async permanentDelete(id: string, userId: string): Promise<void> {
    await mutateDemoDatabase((db) => {
      db.activities = db.activities.filter(
        (activity) => !(activity.id === id && activity.userId === userId),
      )
    })
    invalidateDashboardCache(userId)
  }

  async count(userId: string): Promise<number> {
    const db = await readDemoDatabase()
    return db.activities.filter((activity) => activity.userId === userId && !activity.isDeleted).length
  }
}

/** Repositório local de disciplinas. */
export class DemoSubjectRepository implements SubjectRepository {
  async list(userId: string): Promise<Subject[]> {
    const db = await readDemoDatabase()
    return db.subjects
      .filter((subject) => subject.userId === userId)
      .map((subject) => ({
        ...(subject as unknown as Subject),
        createdAt: new Date(String(subject.createdAt)),
        updatedAt: new Date(String(subject.updatedAt)),
      }))
      .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))
  }

  async getById(id: string, userId: string): Promise<Subject | null> {
    const subjects = await this.list(userId)
    return subjects.find((subject) => subject.id === id) ?? null
  }

  async create(userId: string, input: CreateSubjectInput): Promise<Subject> {
    const now = new Date()
    const subject: Subject = {
      id: crypto.randomUUID(),
      userId,
      name: input.name.trim(),
      code: input.code?.trim() || undefined,
      color: input.color || '#c4b5fd',
      professor: input.professor?.trim() || undefined,
      createdAt: now,
      updatedAt: now,
    }
    await mutateDemoDatabase((db) => {
      db.subjects.push({
        ...subject,
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
      })
    })
    invalidateDashboardCache(userId)
    return subject
  }

  async update(id: string, userId: string, input: Partial<CreateSubjectInput>): Promise<Subject> {
    const updated = await mutateDemoDatabase((db) => {
      const row = db.subjects.find((subject) => subject.id === id && subject.userId === userId)
      if (!row) throw new Error('Disciplina não encontrada')
      if (input.name !== undefined) row.name = input.name.trim()
      if (input.code !== undefined) row.code = input.code.trim() || undefined
      if (input.color !== undefined) row.color = input.color
      if (input.professor !== undefined) row.professor = input.professor.trim() || undefined
      row.updatedAt = new Date().toISOString()
      return row
    })
    invalidateDashboardCache(userId)
    return {
      ...(updated as unknown as Subject),
      createdAt: new Date(String(updated.createdAt)),
      updatedAt: new Date(String(updated.updatedAt)),
    }
  }

  async delete(id: string, userId: string): Promise<void> {
    await mutateDemoDatabase((db) => {
      db.subjects = db.subjects.filter(
        (subject) => !(subject.id === id && subject.userId === userId),
      )
      db.activities.forEach((activity) => {
        if (activity.userId === userId && activity.subjectId === id) {
          activity.subjectId = undefined
        }
      })
    })
    invalidateDashboardCache(userId)
  }
}

export const demoActivityRepository = new DemoActivityRepository()
export const demoSubjectRepository = new DemoSubjectRepository()
