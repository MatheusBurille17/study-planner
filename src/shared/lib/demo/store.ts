import { promises as fs } from 'node:fs'
import path from 'node:path'
import { randomUUID, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto'

/**
 * Banco de dados local usado quando o Supabase não está configurado.
 * Mantém o app totalmente funcional para demonstração local.
 */
export interface DemoUser {
  id: string
  email: string
  name?: string
  passwordHash: string
  salt: string
  createdAt: string
  lastSignInAt?: string
}

export interface DemoDatabase {
  users: DemoUser[]
  activities: Record<string, unknown>[]
  subjects: Record<string, unknown>[]
  pushSubscriptions: Record<string, unknown>[]
  notificationPreferences: Record<string, unknown>[]
  notificationLogs: Record<string, unknown>[]
  notificationDelivery: Record<string, unknown>[]
}

const DATA_DIR = path.join(process.cwd(), '.data')
const DB_FILE = path.join(DATA_DIR, 'db.json')

const emptyDatabase: DemoDatabase = {
  users: [],
  activities: [],
  subjects: [],
  pushSubscriptions: [],
  notificationPreferences: [],
  notificationLogs: [],
  notificationDelivery: [],
}

let writeChain: Promise<unknown> = Promise.resolve()

async function readDatabase(): Promise<DemoDatabase> {
  try {
    const raw = await fs.readFile(DB_FILE, 'utf8')
    const parsed = JSON.parse(raw) as Partial<DemoDatabase>
    return { ...emptyDatabase, ...parsed }
  } catch {
    return { ...emptyDatabase }
  }
}

async function writeDatabase(database: DemoDatabase): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true })
  await fs.writeFile(DB_FILE, JSON.stringify(database, null, 2), 'utf8')
}

/** Executa uma mutação serializada no arquivo local. */
export async function mutateDemoDatabase<T>(
  mutator: (database: DemoDatabase) => T | Promise<T>,
): Promise<T> {
  const run = async () => {
    const database = await readDatabase()
    const result = await mutator(database)
    await writeDatabase(database)
    return result
  }
  const next = writeChain.then(run, run)
  writeChain = next.catch(() => undefined)
  return next
}

export async function readDemoDatabase(): Promise<DemoDatabase> {
  return readDatabase()
}

export function hashPassword(password: string, salt = randomBytes(16).toString('hex')): { hash: string; salt: string } {
  const hash = scryptSync(password, salt, 64).toString('hex')
  return { hash, salt }
}

export function verifyPassword(password: string, salt: string, hash: string): boolean {
  try {
    const candidate = scryptSync(password, salt, 64)
    const expected = Buffer.from(hash, 'hex')
    return candidate.length === expected.length && timingSafeEqual(candidate, expected)
  } catch {
    return false
  }
}

function daysFromNow(days: number, hour = 18, minute = 0): string {
  const date = new Date()
  date.setDate(date.getDate() + days)
  date.setHours(hour, minute, 0, 0)
  return date.toISOString()
}

function dateOnly(days: number): string {
  const date = new Date()
  date.setDate(date.getDate() + days)
  return date.toISOString().slice(0, 10)
}

export interface SeedOptions {
  userId: string
}

/** Cria disciplinas e atividades de exemplo para o modo demonstração. */
export async function seedDemoDataForUser({ userId }: SeedOptions): Promise<void> {
  await mutateDemoDatabase((database) => {
    const existing = database.subjects.filter((subject) => subject.userId === userId)
    if (existing.length > 0) return

    const now = new Date().toISOString()
    const subjects = [
      { name: 'Cálculo II', code: 'MAT002', color: '#c4b5fd', professor: 'Prof. Helena Prado' },
      { name: 'Direito Civil', code: 'DIR101', color: '#b7d7c2', professor: 'Prof. Ricardo Alves' },
      { name: 'Anatomia', code: 'MED210', color: '#f8cfb4', professor: 'Prof. Camila Reis' },
      { name: 'Psicologia', code: 'PSI150', color: '#f3c4cf', professor: 'Prof. Marina Lopes' },
      { name: 'Literatura Brasileira', code: 'LET080', color: '#f4e6b5', professor: 'Prof. Ana Beatriz' },
    ]

    const byName = new Map<string, string>()
    for (const subject of subjects) {
      const id = randomUUID()
      byName.set(subject.name, id)
      database.subjects.push({
        id,
        userId,
        ...subject,
        createdAt: now,
        updatedAt: now,
      })
    }

    database.activities.push(
      {
        id: randomUUID(),
        userId,
        type: 'task',
        title: 'Revisar derivadas e integrais',
        description: 'Resolver a lista 5 e revisar regras de derivação.',
        subjectId: byName.get('Cálculo II'),
        dueDate: daysFromNow(1, 18),
        dueTime: '18:00',
        priority: 'HIGH',
        status: 'TODO',
        estimatedTimeMinutes: 90,
        tags: ['revisão', 'lista'],
        reminders: [],
        createdAt: now,
        updatedAt: now,
      },
      {
        id: randomUUID(),
        userId,
        type: 'task',
        title: 'Ler capítulo 4 – Responsabilidade Civil',
        description: 'Fichamento dos pontos principais para discussão em sala.',
        subjectId: byName.get('Direito Civil'),
        dueDate: daysFromNow(3, 20),
        dueTime: '20:00',
        priority: 'MEDIUM',
        status: 'IN_PROGRESS',
        estimatedTimeMinutes: 60,
        tags: ['leitura'],
        reminders: [],
        createdAt: now,
        updatedAt: now,
      },
      {
        id: randomUUID(),
        userId,
        type: 'exam',
        title: 'Prova de Anatomia – Sistema Nervoso',
        description: 'Conteúdo: medula espinal, tronco encefálico e nervos cranianos.',
        subjectId: byName.get('Anatomia'),
        date: daysFromNow(5, 10),
        time: '10:00',
        examType: 'WRITTEN',
        content: ['Medula espinal', 'Tronco encefálico', 'Nervos cranianos'],
        location: 'Sala 204 – Bloco B',
        notes: 'Levar atlas e lápis de cor.',
        reminders: [],
        createdAt: now,
        updatedAt: now,
      },
      {
        id: randomUUID(),
        userId,
        type: 'assignment',
        title: 'Relatório de Psicologia do Desenvolvimento',
        description: 'Observação de campo e análise à luz das teorias de Piaget e Vygotsky.',
        subjectId: byName.get('Psicologia'),
        dueDate: daysFromNow(7, 23),
        dueTime: '23:59',
        assignmentType: 'PROJECT',
        criteria: 'Introdução, metodologia, análise e referências (ABNT).',
        status: 'PENDING',
        reminders: [],
        createdAt: now,
        updatedAt: now,
      },
      {
        id: randomUUID(),
        userId,
        type: 'task',
        title: 'Fichamento de Literatura Brasileira',
        description: 'Fichar o romance "Memórias Póstumas de Brás Cubas".',
        subjectId: byName.get('Literatura Brasileira'),
        dueDate: daysFromNow(-1, 19),
        dueTime: '19:00',
        priority: 'LOW',
        status: 'COMPLETED',
        estimatedTimeMinutes: 45,
        tags: ['fichamento'],
        reminders: [],
        createdAt: now,
        updatedAt: now,
      },
      {
        id: randomUUID(),
        userId,
        type: 'exam',
        title: 'Avaliação de Direito Civil',
        description: 'Prova oral sobre contratos e obrigações.',
        subjectId: byName.get('Direito Civil'),
        date: daysFromNow(12, 14),
        time: '14:00',
        examType: 'ORAL',
        content: ['Contratos', 'Obrigações'],
        location: 'Sala 102',
        reminders: [],
        createdAt: now,
        updatedAt: now,
      },
    )
  })
}
