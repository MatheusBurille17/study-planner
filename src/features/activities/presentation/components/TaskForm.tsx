'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { CalendarDays, Clock3, Tag, Timer } from 'lucide-react'
import { Button } from '@/shared/components/ui/button'
import { Input } from '@/shared/components/ui/input'
import { Select } from '@/shared/components/ui/select'
import { Textarea } from '@/shared/components/ui/textarea'
import { Spinner } from '@/shared/components/ui/spinner'
import {
  PRIORITY_LABELS,
  Priority,
  REMINDER_TYPE_LABELS,
  TASK_STATUS_LABELS,
  TaskStatus,
  type ReminderInput,
  type Task,
} from '@/shared/types/activity'
import type { Subject } from '@/shared/types/subject'
import { combineDateAndTime, parseISODate, toISODate } from '@/shared/utils/dateHelpers'
import { FormField } from './FormField'
import { SegmentedControl } from './FormControls'
import { ReminderConfigurator } from './ReminderConfigurator'
import { createTaskSchema, updateTaskSchema } from '../schemas/createActivitySchema'
import { useActivityCreation } from '../hooks/useActivityCreation'
import { useFormHistory, UndoRedoControls } from '../hooks/useFormHistory'
import { useUnsavedChangesWarning } from '../hooks/useUnsavedChangesWarning'
import { ConflictResolver } from './ConflictResolver'
import type { CreateActivityDTO } from '../../application/dto/CreateActivityDTO'

interface TaskFormProps {
  subjects: Subject[]
  initialActivity?: Task
  mode?: 'create' | 'edit'
}

export function TaskForm({ subjects, initialActivity, mode = 'create' }: TaskFormProps) {
  const [form, setForm] = useState({
    title: initialActivity?.title ?? '',
    description: initialActivity?.description ?? '',
    subjectId: initialActivity?.subjectId ?? '',
    dueDate: toISODate(initialActivity?.dueDate),
    dueTime: initialActivity?.dueTime ?? '',
    priority: (initialActivity?.priority ?? Priority.MEDIUM) as Priority,
    status: (initialActivity?.status ?? TaskStatus.TODO) as TaskStatus,
    estimatedTimeMinutes: initialActivity?.estimatedTimeMinutes?.toString() ?? '',
    tags: initialActivity?.tags?.join(', ') ?? '',
  })
  const [reminders, setReminders] = useState<ReminderInput[]>(
    (initialActivity?.reminders ?? []).map(({ reminderType, reminderTime, reminderOffset }) => ({
      reminderType,
      reminderTime,
      reminderOffset,
    })),
  )
  const [errors, setErrors] = useState<Record<string, string[] | undefined>>({})
  const { submit, update, resolveConflict, conflict, isSubmitting, serverError, isOnline } = useActivityCreation()
  const history = useFormHistory(form, setForm)
  const initialSnapshot = useMemo(
    () => JSON.stringify({ form: initialActivity ?? null, remindersCount: initialActivity?.reminders?.length ?? 0 }),
    [initialActivity],
  )
  useUnsavedChangesWarning(
    JSON.stringify({ form, remindersCount: reminders.length }) !== initialSnapshot,
  )

  function setField<K extends keyof typeof form>(field: K, value: (typeof form)[K]) {
    history.update({ ...form, [field]: value })
  }

  const eventDate = useMemo(() => {
    const date = parseISODate(form.dueDate)
    return date ? combineDateAndTime(date, form.dueTime || undefined) : undefined
  }, [form.dueDate, form.dueTime])

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault()
    const tags = form.tags
      .split(',')
      .map((tag) => tag.trim())
      .filter(Boolean)

    const payload = {
      type: 'task' as const,
      title: form.title,
      description: form.description || undefined,
      subjectId: form.subjectId || undefined,
      dueDate: form.dueDate || undefined,
      dueTime: form.dueTime || undefined,
      priority: form.priority,
      status: form.status,
      estimatedTimeMinutes: form.estimatedTimeMinutes === '' ? undefined : Number(form.estimatedTimeMinutes),
      tags: tags.length ? tags : undefined,
      reminders: reminders.length ? reminders : undefined,
    }

    const schema = mode === 'edit' ? updateTaskSchema : createTaskSchema
    const parsed = schema.safeParse(payload)
    if (!parsed.success) {
      setErrors(parsed.error.flatten().fieldErrors)
      return
    }
    setErrors({})

    const meta = { title: form.title, type: 'task' }
    if (mode === 'edit' && initialActivity) {
      await update(
        {
          ...(parsed.data as CreateActivityDTO),
          id: initialActivity.id,
          expectedUpdatedAt: initialActivity.updatedAt.toISOString(),
        },
        meta,
      )
    } else {
      await submit(parsed.data as CreateActivityDTO, meta)
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5" noValidate>
      <div className="flex items-center justify-between">
        <p className="text-[11px] text-muted">Você pode desfazer e refazer alterações.</p>
        <UndoRedoControls
          canUndo={history.canUndo}
          canRedo={history.canRedo}
          onUndo={history.undo}
          onRedo={history.redo}
        />
      </div>
      {!isOnline && (
        <div className="rounded-xl border border-butter bg-butter/30 px-4 py-3 text-sm text-[#7a6422]">
          Você está offline. A atividade será sincronizada ao conectar.
        </div>
      )}

      <section className="space-y-5 rounded-3xl border border-line bg-surface p-5 shadow-card">
        <FormField
          label="Título da tarefa"
          htmlFor="title"
          required
          error={errors.title?.[0]}
          maxLength={200}
          currentLength={form.title.length}
        >
          <Input
            id="title"
            value={form.title}
            onChange={(event) => setField('title', event.target.value)}
            placeholder="Ex.: Revisar cálculo para a prova"
            maxLength={200}
          />
        </FormField>

        <FormField
          label="Descrição"
          htmlFor="description"
          error={errors.description?.[0]}
          maxLength={2000}
          currentLength={form.description.length}
          hint="Opcional. Anote o que precisa ser feito."
        >
          <Textarea
            id="description"
            value={form.description}
            onChange={(event) => setField('description', event.target.value)}
            placeholder="Detalhes, páginas, exercícios…"
            maxLength={2000}
          />
        </FormField>

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Disciplina" htmlFor="subjectId" error={errors.subjectId?.[0]}>
            <Select
              id="subjectId"
              value={form.subjectId}
              onChange={(event) => setField('subjectId', event.target.value)}
            >
              <option value="">Sem disciplina</option>
              {subjects.map((subject) => (
                <option key={subject.id} value={subject.id}>
                  {subject.name}
                </option>
              ))}
            </Select>
            {subjects.length === 0 && (
              <p className="text-[11px] text-muted">
                Nenhuma disciplina cadastrada.{' '}
                <Link href="/subjects" className="text-primary underline">
                  Cadastrar agora
                </Link>
              </p>
            )}
          </FormField>

          <FormField
            label="Tempo estimado (min)"
            htmlFor="estimatedTimeMinutes"
            error={errors.estimatedTimeMinutes?.[0]}
            hint="Opcional, de 0 a 999 minutos."
          >
            <div className="relative">
              <Timer className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
              <Input
                id="estimatedTimeMinutes"
                type="number"
                min={0}
                max={999}
                className="pl-10"
                value={form.estimatedTimeMinutes}
                onChange={(event) => setField('estimatedTimeMinutes', event.target.value)}
                placeholder="45"
              />
            </div>
          </FormField>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Prazo" htmlFor="dueDate" error={errors.dueDate?.[0]}>
            <div className="relative">
              <CalendarDays className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
              <Input
                id="dueDate"
                type="date"
                className="pl-10"
                min={mode === 'create' ? toISODate(new Date()) : undefined}
                value={form.dueDate}
                onChange={(event) => setField('dueDate', event.target.value)}
              />
            </div>
          </FormField>
          <FormField label="Hora" htmlFor="dueTime" error={errors.dueTime?.[0]}>
            <div className="relative">
              <Clock3 className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
              <Input
                id="dueTime"
                type="time"
                className="pl-10"
                value={form.dueTime}
                onChange={(event) => setField('dueTime', event.target.value)}
                disabled={!form.dueDate}
              />
            </div>
          </FormField>
        </div>
      </section>

      <section className="space-y-5 rounded-3xl border border-line bg-surface p-5 shadow-card">
        <FormField label="Prioridade" required error={errors.priority?.[0]}>
          <SegmentedControl
            ariaLabel="Prioridade"
            columns={3}
            value={form.priority}
            onChange={(value) => setField('priority', value)}
            options={[
              { value: Priority.LOW, label: PRIORITY_LABELS[Priority.LOW] },
              { value: Priority.MEDIUM, label: PRIORITY_LABELS[Priority.MEDIUM] },
              { value: Priority.HIGH, label: PRIORITY_LABELS[Priority.HIGH] },
            ]}
          />
        </FormField>

        <FormField label="Status" required error={errors.status?.[0]}>
          <SegmentedControl
            ariaLabel="Status"
            columns={3}
            value={form.status}
            onChange={(value) => setField('status', value)}
            options={[
              { value: TaskStatus.TODO, label: TASK_STATUS_LABELS[TaskStatus.TODO] },
              { value: TaskStatus.IN_PROGRESS, label: TASK_STATUS_LABELS[TaskStatus.IN_PROGRESS] },
              { value: TaskStatus.COMPLETED, label: TASK_STATUS_LABELS[TaskStatus.COMPLETED] },
            ]}
          />
        </FormField>

        <FormField
          label="Tags"
          htmlFor="tags"
          error={errors.tags?.[0]}
          hint="Separe por vírgulas. Máximo de 10 tags."
        >
          <div className="relative">
            <Tag className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <Input
              id="tags"
              className="pl-10"
              value={form.tags}
              onChange={(event) => setField('tags', event.target.value)}
              placeholder="revisão, lista, exercícios"
            />
          </div>
        </FormField>
      </section>

      <section className="rounded-3xl border border-line bg-surface p-5 shadow-card">
        <ReminderConfigurator reminders={reminders} onChange={setReminders} eventDate={eventDate} />
      </section>

      {serverError && (
        <div role="alert" className="rounded-xl border border-[#ef4444]/30 bg-[#ef4444]/5 px-4 py-3 text-sm text-[#b91c1c]">
          {serverError}
        </div>
      )}

      <div className="flex gap-3">
        <Button type="submit" className="flex-1" disabled={isSubmitting}>
          {isSubmitting ? (
            <>
              <Spinner /> Salvando…
            </>
          ) : mode === 'edit' ? (
            'Salvar alterações'
          ) : (
            'Salvar tarefa'
          )}
        </Button>
      </div>

      <ConflictResolver
        conflict={conflict}
        open={Boolean(conflict)}
        onResolve={(choice) => void resolveConflict(choice)}
        subjects={subjects}
      />

      <p className="text-center text-[11px] text-muted">
        Você poderá ajustar os lembretes depois nas configurações da atividade.
      </p>
    </form>
  )
}
