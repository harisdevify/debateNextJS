import 'axios';

declare module 'axios' {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars
  interface AxiosRequestConfig<D = any> {
    /** Skip the global error toast for this request (e.g. /auth/me on load). */
    silent?: boolean;
  }
}
