/** List-endpoint response envelope, per docs/architecture/API.md. */
export interface PaginatedResult<T> {
  data: T[];
  meta: {
    page: number;
    perPage: number;
    total: number;
  };
}
