'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { CalendarDays, Clock3 } from 'lucide-react'
import { Button } from '@/shared/components/ui/button'
import { Input } from '@/shared/components/ui/input'
import { Select } from '@/shared/components/ui/select'
import { Textarea } from '@/shared/components/ui/textarea'
import { Spinner } from '@/shared/components/ui/spinner'
import {
  ASSIGNMENT_STATUS_LABELS,
  ASSIGNMENT_TYPE_LABELS,
  AssignmentStatus,
  AssignmentType,
  type Assignment,
  type ReminderInput,
} from '@/shared/types/activity'
import type { Subject } from '@/shared/types/subject'
import {
  getDaysRemaining,
  parseISODate,
  toISODate,
} from '@/shared/utils/dateHelpers'
import { getUserTimeZone } from '@/shared/utils/timezone'
import { resolveEventDateTime } from '../../domain/rules'
import { FormField } from './FormField'
import { SegmentedControl } from './FormControls'
import { ReminderConfigurator } from './ReminderConfigurator'
import { createAssignmentSchema, updateAssignmentSchema } from '../schemas/createActivitySchema'
import { useActivityCreation } from '../hooks/useActivityCreation'
import { useFormHistory, UndoRedoControls } from '../hooks/useFormHistory'
import { useUnsavedChangesWarning } from '../hooks/useUnsavedChangesWarning'
import { ConflictResolver } from './ConflictResolver'
import type { CreateActivityDTO } from '../../application/dto/CreateActivityDTO'

interface AssignmentFormProps {
  subjects: Subject[]
  initialActivity?: Assignment
  mode?: 'create' | 'edit'
}

export function AssignmentForm({ subjects, initialActivity, mode = 'create' }: AssignmentFormProps) {
  const [form, setForm] = useState({
    title: initialActivity?.title ?? '',
    description: initialActivity?.description ?? '',
    subjectId: initialActivity?.subjectId ?? '',
    dueDate: toISODate(initialActivity?.dueDate),
    dueTime: initialActivity?.dueTime ?? '',
    assignmentType: (initialActivity?.assignmentType ?? AssignmentType.WRITTEN) as AssignmentType,
    criteria: initialActivity?.criteria ?? '',
    status: (initialActivity?.status ?? AssignmentStatus.PENDING) as AssignmentStatus,
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
    return date
      ? resolveEventDateTime({ type: 'assignment', dueDate: date, dueTime: form.dueTime || undefined })
      : undefined
  }, [form.dueDate, form.dueTime])

  const daysRemaining = getDaysRemaining(parseISODate(form.dueDate))

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault()
    const payload = {
      type: 'assignment' as const,
      title: form.title,
      description: form.description,
      subjectId: form.subjectId,
      dueDate: form.dueDate || undefined,
      dueTime: form.dueTime || undefined,
      assignmentType: form.assignmentType,
      criteria: form.criteria || undefined,
      status: form.status,
      reminders: reminders.length ? reminders : undefined,
      timezone: getUserTimeZone(),
    }

    const schema = mode === 'edit' ? updateAssignmentSchema : createAssignmentSchema
    const parsed = schema.safeParse(payload)
    if (!parsed.success) {
      setErrors(parsed.error.flatten().fieldErrors)
      return
    }
    setErrors({})

    const meta = { title: form.title, type: 'assignment' }
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
          label="Título do trabalho"
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
            placeholder="Ex.: Relatório de Psicologia"
            maxLength={200}
          />
        </FormField>

        <FormField label="Disciplina" htmlFor="subjectId" required error={errors.subjectId?.[0]}>
          <Select
            id="subjectId"
            value={form.subjectId}
            onChange={(event) => setField('subjectId', event.target.value)}
          >
            <option value="">Selecione uma disciplina</option>
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
          label="Descrição da atividade"
          htmlFor="description"
          required
          error={errors.description?.[0]}
          maxLength={3000}
          currentLength={form.description.length}
        >
          <Textarea
            id="description"
            value={form.description}
            onChange={(event) => setField('description', event.target.value)}
            placeholder="O que deve ser entregue? Quais são as etapas?"
            maxLength={3000}
            rows={5}
          />
        </FormField>

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            label="Data de entrega"
            htmlFor="dueDate"
            required
            error={errors.dueDate?.[0]}
            hint={
              daysRemaining === null
                ? undefined
                : daysRemaining >= 0
                  ? `Faltam ${daysRemaining} ${daysRemaining === 1 ? 'dia' : 'dias'}`
                  : `${Math.abs(daysRemaining)} dias atrás`
            }
          >
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
        <FormField label="Tipo de trabalho" required error={errors.assignmentType?.[0]}>
          <SegmentedControl
            ariaLabel="Tipo de trabalho"
            columns={3}
            value={form.assignmentType}
            onChange={(value) => setField('assignmentType', value)}
            options={[
              { value: AssignmentType.WRITTEN, label: 'Escrito' },
              { value: AssignmentType.PRESENTATION, label: 'Apresentação' },
              { value: AssignmentType.PROJECT, label: 'Projeto' },
            ]}
          />
        </FormField>

        {form.assignmentType === AssignmentType.PRESENTATION && (
          <p className="rounded-xl bg-butter/30 px-3 py-2 text-[11px] text-[#7a6422]">
            Dica: para apresentações, anote local e horário na descrição.
          </p>
        )}

        <FormField
          label="Critérios de avaliação"
          htmlFor="criteria"
          error={errors.criteria?.[0]}
          maxLength={2000}
          currentLength={form.criteria.length}
          hint="Opcional. Rubricas, formatação, peso de cada parte…"
        >
          <Textarea
            id="criteria"
            value={form.criteria}
            onChange={(event) => setField('criteria', event.target.value)}
            placeholder="Ex.: Introdução, metodologia, referências ABNT"
            maxLength={2000}
          />
        </FormField>

        <FormField label="Status de entrega" required error={errors.status?.[0]}>
          <SegmentedControl
            ariaLabel="Status de entrega"
            columns={3}
            value={form.status}
            onChange={(value) => setField('status', value)}
            options={[
              { value: AssignmentStatus.PENDING, label: ASSIGNMENT_STATUS_LABELS[AssignmentStatus.PENDING] },
              { value: AssignmentStatus.SUBMITTED, label: ASSIGNMENT_STATUS_LABELS[AssignmentStatus.SUBMITTED] },
              { value: AssignmentStatus.GRADED, label: ASSIGNMENT_STATUS_LABELS[AssignmentStatus.GRADED] },
            ]}
          />
        </FormField>
      </section>

      <section className="rounded-3xl border border-line bg-surface p-5 shadow-card">
        <ReminderConfigurator
          reminders={reminders}
          onChange={setReminders}
          eventDate={eventDate}
          eventHasTime={Boolean(form.dueTime)}
          error={errors.reminders?.[0]}
        />
      </section>

      {serverError && (
        <div role="alert" className="rounded-xl border border-[#ef4444]/30 bg-[#ef4444]/5 px-4 py-3 text-sm text-[#b91c1c]">
          {serverError}
        </div>
      )}

      <ConflictResolver
        conflict={conflict}
        open={Boolean(conflict)}
        onResolve={(choice) => void resolveConflict(choice)}
        subjects={subjects}
      />

      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? (
          <>
            <Spinner /> Salvando…
          </>
        ) : mode === 'edit' ? (
          'Salvar alterações'
        ) : (
          'Salvar trabalho'
        )}
      </Button>
    </form>
  )
}
