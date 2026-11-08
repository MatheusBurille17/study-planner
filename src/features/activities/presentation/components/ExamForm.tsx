'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { CalendarDays, Clock3, MapPin } from 'lucide-react'
import { Button } from '@/shared/components/ui/button'
import { Input } from '@/shared/components/ui/input'
import { Select } from '@/shared/components/ui/select'
import { Textarea } from '@/shared/components/ui/textarea'
import { Spinner } from '@/shared/components/ui/spinner'
import {
  EXAM_TYPE_LABELS,
  ExamType,
  type Exam,
  type ReminderInput,
} from '@/shared/types/activity'
import type { Subject } from '@/shared/types/subject'
import {
  combineDateAndTime,
  formatWeekday,
  parseISODate,
  toISODate,
} from '@/shared/utils/dateHelpers'
import { FormField } from './FormField'
import { SegmentedControl } from './FormControls'
import { ReminderConfigurator } from './ReminderConfigurator'
import { createExamSchema, updateExamSchema } from '../schemas/createActivitySchema'
import { useActivityCreation } from '../hooks/useActivityCreation'
import { useFormHistory, UndoRedoControls } from '../hooks/useFormHistory'
import { useUnsavedChangesWarning } from '../hooks/useUnsavedChangesWarning'
import { ConflictResolver } from './ConflictResolver'
import type { CreateActivityDTO } from '../../application/dto/CreateActivityDTO'

interface ExamFormProps {
  subjects: Subject[]
  initialActivity?: Exam
  mode?: 'create' | 'edit'
}

export function ExamForm({ subjects, initialActivity, mode = 'create' }: ExamFormProps) {
  const [form, setForm] = useState({
    title: initialActivity?.title ?? '',
    description: initialActivity?.description ?? '',
    subjectId: initialActivity?.subjectId ?? '',
    date: toISODate(initialActivity?.date),
    time: initialActivity?.time ?? '',
    examType: (initialActivity?.examType ?? ExamType.WRITTEN) as ExamType,
    content: initialActivity?.content?.join(', ') ?? '',
    location: initialActivity?.location ?? '',
    notes: initialActivity?.notes ?? '',
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
    const date = parseISODate(form.date)
    return date ? combineDateAndTime(date, form.time || undefined) : undefined
  }, [form.date, form.time])

  const selectedSubject = subjects.find((subject) => subject.id === form.subjectId)

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault()
    const content = form.content
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean)
    const title = form.title.trim() || `Prova de ${selectedSubject?.name ?? 'conteúdo'}`

    const payload = {
      type: 'exam' as const,
      title,
      description: form.description || undefined,
      subjectId: form.subjectId,
      date: form.date || undefined,
      time: form.time || undefined,
      examType: form.examType,
      content: content.length ? content : undefined,
      location: form.location || undefined,
      notes: form.notes || undefined,
      reminders: reminders.length ? reminders : undefined,
    }

    const schema = mode === 'edit' ? updateExamSchema : createExamSchema
    const parsed = schema.safeParse(payload)
    if (!parsed.success) {
      setErrors(parsed.error.flatten().fieldErrors)
      return
    }
    setErrors({})

    const meta = { title, type: 'exam' }
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
          label="Título da prova"
          htmlFor="title"
          error={errors.title?.[0]}
          maxLength={200}
          currentLength={form.title.length}
          hint="Opcional. Se vazio, usaremos o nome da disciplina."
        >
          <Input
            id="title"
            value={form.title}
            onChange={(event) => setField('title', event.target.value)}
            placeholder="Ex.: Prova de Anatomia – Sistema Nervoso"
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

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            label="Data da prova"
            htmlFor="date"
            required
            error={errors.date?.[0]}
            hint={form.date ? formatWeekday(parseISODate(form.date)) : undefined}
          >
            <div className="relative">
              <CalendarDays className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
              <Input
                id="date"
                type="date"
                className="pl-10"
                min={mode === 'create' ? toISODate(new Date()) : undefined}
                value={form.date}
                onChange={(event) => setField('date', event.target.value)}
              />
            </div>
          </FormField>
          <FormField label="Hora" htmlFor="time" error={errors.time?.[0]}>
            <div className="relative">
              <Clock3 className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
              <Input
                id="time"
                type="time"
                className="pl-10"
                value={form.time}
                onChange={(event) => setField('time', event.target.value)}
                disabled={!form.date}
              />
            </div>
          </FormField>
        </div>

        <FormField label="Tipo de prova" required error={errors.examType?.[0]}>
          <SegmentedControl
            ariaLabel="Tipo de prova"
            columns={3}
            value={form.examType}
            onChange={(value) => setField('examType', value)}
            options={[
              { value: ExamType.WRITTEN, label: EXAM_TYPE_LABELS[ExamType.WRITTEN] },
              { value: ExamType.ORAL, label: EXAM_TYPE_LABELS[ExamType.ORAL] },
              { value: ExamType.PRACTICAL, label: EXAM_TYPE_LABELS[ExamType.PRACTICAL] },
            ]}
          />
        </FormField>
      </section>

      <section className="space-y-5 rounded-3xl border border-line bg-surface p-5 shadow-card">
        <FormField
          label="Conteúdos abordados"
          htmlFor="content"
          error={errors.content?.[0]}
          hint="Separe os tópicos por vírgula. Máximo de 10."
        >
          <Input
            id="content"
            value={form.content}
            onChange={(event) => setField('content', event.target.value)}
            placeholder="Derivadas, integrais, limites"
          />
        </FormField>

        <FormField label="Local / Sala" htmlFor="location" error={errors.location?.[0]}>
          <div className="relative">
            <MapPin className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <Input
              id="location"
              className="pl-10"
              value={form.location}
              onChange={(event) => setField('location', event.target.value)}
              placeholder="Ex.: Sala 204 – Bloco B"
              maxLength={100}
            />
          </div>
        </FormField>

        <FormField
          label="Observações"
          htmlFor="notes"
          error={errors.notes?.[0]}
          maxLength={1000}
          currentLength={form.notes.length}
          hint="Opcional. Materiais permitidos, orientações do professor…"
        >
          <Textarea
            id="notes"
            value={form.notes}
            onChange={(event) => setField('notes', event.target.value)}
            placeholder="O que levar, o que revisar…"
            maxLength={1000}
          />
        </FormField>

        <FormField label="Descrição" htmlFor="description" error={errors.description?.[0]} hint="Opcional.">
          <Textarea
            id="description"
            value={form.description}
            onChange={(event) => setField('description', event.target.value)}
            placeholder="Resumo do conteúdo"
            maxLength={2000}
          />
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

      <ConflictResolver
        conflict={conflict}
        open={Boolean(conflict)}
        onResolve={(choice) => void resolveConflict(choice)}
      />

      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? (
          <>
            <Spinner /> Salvando…
          </>
        ) : mode === 'edit' ? (
          'Salvar alterações'
        ) : (
          'Salvar prova'
        )}
      </Button>
    </form>
  )
}
