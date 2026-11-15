import axios from 'axios';

export const getErrorMessage = (err: unknown, fallback = 'Something went wrong'): string => {
  if (axios.isAxiosError(err)) {
    const data = err.response?.data as { message?: string } | undefined;
    return data?.message || err.message || fallback;
  }
  if (err instanceof Error) {
    return err.message;
  }
  return fallback;
};
