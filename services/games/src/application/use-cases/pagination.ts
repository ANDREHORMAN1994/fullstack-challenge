export type PaginationInput = {
  page?: number;
  limit?: number;
};

export type PaginationOutput = {
  page: number;
  limit: number;
  hasNextPage: boolean;
};

export const DEFAULT_PAGE = 1;
export const DEFAULT_LIMIT = 20;
export const MAX_LIMIT = 100;

export const normalizePagination = (input: PaginationInput) => {
  const page = input.page ?? DEFAULT_PAGE;
  const limit = input.limit ?? DEFAULT_LIMIT;

  if (!Number.isInteger(page) || page < 1) {
    throw new Error("Page must be a positive integer");
  }

  if (!Number.isInteger(limit) || limit < 1 || limit > MAX_LIMIT) {
    throw new Error(`Limit must be between 1 and ${MAX_LIMIT}`);
  }

  return {
    page,
    limit,
    offset: (page - 1) * limit,
  };
};
