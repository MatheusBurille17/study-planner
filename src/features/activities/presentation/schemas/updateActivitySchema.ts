import { z } from 'zod'

export {
  updateTaskSchema,
  updateExamSchema,
  updateAssignmentSchema,
  updateActivitySchema,
  type UpdateActivityInput,
} from './createActivitySchema'

/** Payload de soft delete — apenas o id é necessário. */
export const deleteActivitySchema = z.object({
  activityId: z.string({ required_error: 'ID é obrigatório' }).uuid('ID inválido'),
})

export type DeleteActivityInput = z.infer<typeof deleteActivitySchema>
