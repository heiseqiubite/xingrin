// Common API response types
//
// 新响应格式：
// - 成功响应：直接返回数据 T（无包装）
// - 分页响应：{ results: T[], total, page, pageSize, totalPages }
// - 错误响应：{ error: { code, message?, details? } }
//
// 注意：旧的 { code, state, message, data } 格式已废弃

/**
 * 错误响应类型
 */
export interface ApiErrorResponse {
  error: {
    code: string;
    message?: string;
    details?: unknown[];
  };
}

/**
 * 旧版 API 响应类型（已废弃，仅保留以向后兼容）
 * @deprecated 请直接使用数据类型 T，后端不再使用此包装格式
 */
export interface LegacyApiResponse<T = unknown> {
  code: string;          // HTTP status code, e.g. "200", "400", "500"
  state: string;         // Business state, e.g. "success", "error"
  message: string;       // Response message
  data?: T;              // Response data
}

// Common batch create response data (corresponds to backend BaseBatchCreateResponseData)
// Applicable to: domains, endpoints and other batch create operations
export interface BatchCreateResponse {
  message: string          // Detailed description, e.g. "Processed 5 domains, created 3 new, 2 existed, 1 skipped"
  requestedCount: number   // Total requested count
  createdCount: number     // Newly created count
  existedCount: number     // Already existed count
  skippedCount?: number    // Skipped count (optional)
  skippedDomains?: Array<{  // Skipped domains list (optional)
    name: string
    reason: string
  }>
}


// Paginated response type
export interface PaginatedResponse<T> {
  results: T[]
  total: number
  page: number
  pageSize: number
  totalPages?: number
}
