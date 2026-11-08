export interface Subject {
  id: string
  userId: string
  name: string
  code?: string
  color?: string
  professor?: string
  createdAt: Date
  updatedAt: Date
}

export interface CreateSubjectInput {
  name: string
  code?: string
  color?: string
  professor?: string
}
