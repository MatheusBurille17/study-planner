import type { ActivityRepository } from '@/features/activities/domain/repository'
import type { Activity } from '@/shared/types/activity'
import { addDays, addMonths, addWeeks, endOfMonth, endOfWeek, startOfMonth, startOfWeek } from 'date-fns'

/**
 * Consultas de calendário. Reutiliza o repositório de atividades
 * (uma única consulta por view, com RLS aplicada pelo repositório).
 */
export class SupabaseCalendarRepository {
  constructor(private readonly activities: ActivityRepository) {}

  async fetchMonthActivities(userId: string, date: Date): Promise<Activity[]> {
    return this.getInRange(userId, startOfMonth(date), endOfMonth(date))
  }

  async fetchWeekActivities(userId: string, startDate: Date): Promise<Activity[]> {
    return this.getInRange(userId, startOfWeek(startDate, { weekStartsOn: 0 }), endOfWeek(startDate, { weekStartsOn: 0 }))
  }

  async fetchDayActivities(userId: string, date: Date): Promise<Activity[]> {
    return this.getInRange(userId, date, date)
  }

  async getInRange(userId: string, start: Date, end: Date): Promise<Activity[]> {
    const activities = await this.activities.getByUserId(userId)
    return activities.filter((activity) => {
      const date =
        activity.type === 'task' || activity.type === 'assignment'
          ? activity.dueDate
          : activity.type === 'exam' || activity.type === 'seminar'
            ? activity.date
            : undefined
      if (!date) return false
      const value = new Date(date)
      value.setHours(0, 0, 0, 0)
      const from = new Date(start)
      from.setHours(0, 0, 0, 0)
      const to = new Date(end)
      to.setHours(23, 59, 59, 999)
      return value >= from && value <= to
    })
  }
}

export { addDays, addMonths, addWeeks }
