import { ZodError } from 'zod'

export type ApiErrorResponse =
  | {
      error: {
        code: 'VALIDATION_ERROR'
        message: string
        details: Array<{ path: string; message: string }>
      }
    }
  | { error: { code: 'UNAUTHORIZED'; message: string } }
  | { error: { code: 'FORBIDDEN'; message: string } }
  | { error: { code: 'INTERNAL'; message: string; request_id?: string } }

export function zodToDetails(err: ZodError) {
  return err.issues.map((i) => ({
    path: i.path.join('.') || '(root)',
    message: i.message,
  }))
}
