import axios from 'axios';

/**
 * A backend failure in the shape the UI needs: the HTTP status, the machine-readable `code` the
 * services put in their error body, and a human-readable detail.
 *
 * Thunks reject with this (via `rejectWithValue`) rather than letting Redux Toolkit serialize the
 * axios Error: `unwrap()` then throws a plain object whose only useful field is a message like
 * "Request failed with status code 422", which is why every failure used to reach the user as the
 * same generic "try again" text.
 */
export interface ApiErrorInfo {
  status: number | null;
  code: string | null;
  message: string | null;
}

interface BackendErrorBody {
  code?: string;
  message?: string;
  error?: string;
}

export const toApiError = (error: unknown): ApiErrorInfo => {
  if (axios.isAxiosError(error)) {
    const body = error.response?.data as BackendErrorBody | string | undefined;
    const fromBody = typeof body === 'string' ? { message: body } : body ?? {};
    return {
      status: error.response?.status ?? null,
      code: fromBody.code ?? null,
      message: fromBody.message ?? fromBody.error ?? error.message ?? null,
    };
  }
  if (error instanceof Error) {
    return { status: null, code: null, message: error.message };
  }
  return { status: null, code: null, message: null };
};

/** Narrows the unknown thrown by `unwrap()` back to {@link ApiErrorInfo}. */
export const asApiError = (error: unknown): ApiErrorInfo => {
  if (error && typeof error === 'object' && 'status' in error && 'code' in error) {
    return error as ApiErrorInfo;
  }
  return toApiError(error);
};
