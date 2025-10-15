import { toast } from 'sonner';

export function notifyError(error: unknown, fallbackMessage: string) {
  const message = extractErrorMessage(error) || fallbackMessage;
  toast.error(message);
}

function extractErrorMessage(error: unknown): string | null {
  if (!error) return null;
  if (typeof error === 'string') return error;
  if (error instanceof Error) return error.message;
  // Supabase error shape
  const errObj = error as Record<string, unknown>;
  if ('message' in errObj && errObj.message) return String(errObj.message);
  if ('error' in errObj && errObj.error && typeof errObj.error === 'object') {
    const inner = errObj.error as Record<string, unknown>;
    if ('message' in inner && inner.message) return String(inner.message);
  }
  return null;
}