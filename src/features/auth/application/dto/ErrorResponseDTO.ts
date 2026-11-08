export interface ErrorResponseDTO {
  error: string
  code?: string
  statusCode: number
  details?: Record<string, string[]>
}
