'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { BookOpen, Pencil, Plus, Trash2 } from 'lucide-react'
import type { Subject } from '@/shared/types/subject'
import { Button } from '@/shared/components/ui/button'
import { Dialog } from '@/shared/components/ui/dialog'
import { Input } from '@/shared/components/ui/input'
import { Label } from '@/shared/components/ui/label'
import { Spinner } from '@/shared/components/ui/spinner'
import { useToast } from '@/shared/components/ui/toast'
import { SUBJECT_COLORS } from '@/shared/constants/defaultValues'
import {
  createSubjectAction,
  deleteSubjectAction,
  updateSubjectAction,
} from '../actions/subjectActions'

const EMPTY: { name: string; code: string; color: string; professor: string } = {
  name: '',
  code: '',
  color: SUBJECT_COLORS[0],
  professor: '',
}

export function SubjectManager({ subjects, activityCounts }: { subjects: Subject[]; activityCounts: Record<string, number> }) {
  const [editing, setEditing] = useState<Subject | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [form, setForm] = useState<{ name: string; code: string; color: string; professor: string }>(EMPTY)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState<Subject | null>(null)
  const router = useRouter()
  const toast = useToast()

  function openCreate() {
    setEditing(null)
    setForm(EMPTY)
    setFormOpen(true)
  }

  function openEdit(subject: Subject) {
    setEditing(subject)
    setForm({
      name: subject.name,
      code: subject.code ?? '',
      color: subject.color ?? SUBJECT_COLORS[0],
      professor: subject.professor ?? '',
    })
    setFormOpen(true)
  }

  async function save() {
    if (!form.name.trim()) {
      toast.error('Nome é obrigatório')
      return
    }
    setSaving(true)
    const result = editing
      ? await updateSubjectAction(editing.id, form)
      : await createSubjectAction(form)
    setSaving(false)
    if (!result.success) {
      toast.error('Não foi possível salvar', { description: result.error?.message })
      return
    }
    toast.success(editing ? 'Disciplina atualizada' : 'Disciplina criada')
    setFormOpen(false)
    router.refresh()
  }

  async function remove() {
    if (!deleting) return
    const result = await deleteSubjectAction(deleting.id)
    if (!result.success) {
      toast.error('Não foi possível excluir', { description: result.error?.message })
      return
    }
    toast.success('Disciplina excluída')
    setDeleting(null)
    router.refresh()
  }

  return (
    <>
      <div className="mb-4 flex justify-end">
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4" /> Nova disciplina
        </Button>
      </div>

      {subjects.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-line bg-surface/60 px-6 py-14 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-50 text-primary">
            <BookOpen className="h-6 w-6" />
          </div>
          <h2 className="mt-4 font-serif text-xl text-ink">Nenhuma disciplina cadastrada</h2>
          <p className="mt-1 max-w-sm text-sm text-muted">
            Cadastre suas matérias para organizar tarefas e provas por disciplina.
          </p>
          <Button className="mt-5" onClick={openCreate}>
            <Plus className="h-4 w-4" /> Criar primeira disciplina
          </Button>
        </div>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {subjects.map((subject) => (
            <li key={subject.id} className="min-w-0 overflow-hidden rounded-3xl border border-line bg-surface p-4 shadow-card">
              <div className="flex items-start gap-3">
                <span
                  className="mt-1 h-9 w-9 shrink-0 rounded-2xl"
                  style={{ backgroundColor: subject.color ?? '#c4b5fd' }}
                />
                <div className="min-w-0 flex-1">
                  <h2
                    className="line-clamp-2 break-words font-serif text-base leading-snug text-ink sm:text-lg"
                    title={subject.name}
                  >
                    {subject.name}
                  </h2>
                  <p className="mt-0.5 break-words text-[11px] leading-snug text-muted">
                    {subject.code ? `${subject.code} · ` : ''}
                    {subject.professor ?? 'Sem professor'}
                  </p>
                  <p className="mt-1 text-[11px] text-muted">
                    {activityCounts[subject.id] ?? 0} atividades vinculadas
                  </p>
                </div>
                <div className="flex shrink-0 gap-1">
                  <button
                    type="button"
                    onClick={() => openEdit(subject)}
                    aria-label={`Editar ${subject.name}`}
                    className="rounded-full p-1.5 text-muted hover:bg-primary-50 hover:text-primary"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleting(subject)}
                    aria-label={`Excluir ${subject.name}`}
                    className="rounded-full p-1.5 text-muted hover:bg-rose/20 hover:text-[#8a3d52]"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      <Dialog
        open={formOpen}
        onOpenChange={setFormOpen}
        title={editing ? 'Editar disciplina' : 'Nova disciplina'}
        description="As cores aparecem nos cartões e no calendário."
      >
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="subjectName">Nome</Label>
            <Input
              id="subjectName"
              value={form.name}
              onChange={(event) => setForm({ ...form, name: event.target.value })}
              placeholder="Ex.: Cálculo II"
              maxLength={100}
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="subjectCode">Código</Label>
              <Input
                id="subjectCode"
                value={form.code}
                onChange={(event) => setForm({ ...form, code: event.target.value })}
                placeholder="MAT002"
                maxLength={50}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="subjectProfessor">Professor(a)</Label>
              <Input
                id="subjectProfessor"
                value={form.professor}
                onChange={(event) => setForm({ ...form, professor: event.target.value })}
                placeholder="Prof. Helena"
                maxLength={150}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Cor</Label>
            <div className="flex flex-wrap gap-2">
              {SUBJECT_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setForm({ ...form, color })}
                  aria-label={`Selecionar cor ${color}`}
                  className={`h-8 w-8 rounded-full border-2 transition-transform ${form.color === color ? 'scale-110 border-ink' : 'border-transparent'}`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setFormOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={() => void save()} disabled={saving}>
              {saving ? <Spinner /> : null} Salvar
            </Button>
          </div>
        </div>
      </Dialog>

      <Dialog open={Boolean(deleting)} onOpenChange={(open) => !open && setDeleting(null)} title="Excluir disciplina?">
        <div className="space-y-4">
          <p className="text-sm text-muted">
            A disciplina <strong className="text-ink">{deleting?.name}</strong> será removida. As atividades
            continuam existindo, mas ficarão sem disciplina.
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setDeleting(null)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={() => void remove()}>
              Excluir
            </Button>
          </div>
        </div>
      </Dialog>
    </>
  )
}
