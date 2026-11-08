import type { CreateActivityDTO } from './CreateActivityDTO'

export interface UpdateActivityDTO extends Partial<Omit<CreateActivityDTO, 'type'>> {
  id: string
}

export interface ErrorResponseDTO {
  code: string
  message: string
  field?: string
}
