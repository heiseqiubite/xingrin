/**
 * API 响应解析器
 * 
 * 统一处理后端 API 响应，支持新的标准化响应格式：
 * - 成功响应: 直接返回数据 T（无包装）
 * - 分页响应: { results: T[], total, page, pageSize, totalPages }
 * - 错误响应: { error: { code: string, message?: string, details?: unknown[] } }
 * 
 * 注意：后端 success_response() 直接返回数据，不再使用 { data: T } 包装
 * service 层已经通过 res.data 解包 axios 响应，所以 hook 拿到的就是最终数据
 */

/**
 * 标准化错误响应类型
 */
export interface ApiErrorResponse {
  error: {
    code: string;
    message?: string;
    details?: unknown[];
  };
}

/**
 * 统一 API 响应类型
 * 成功：直接返回数据 T
 * 错误：{ error: { code, message?, details? } }
 */
export type ApiResponse<T = unknown> = T | ApiErrorResponse;

/**
 * 旧版 API 响应类型（向后兼容）
 */
export interface LegacyApiResponse<T = unknown> {
  code: string;
  state: string;
  message: string;
  data?: T;
}

/**
 * 判断响应是否为错误响应
 * 
 * @param response - API 响应对象
 * @returns 如果是错误响应返回 true
 * 
 * @example
 * const response = await api.get('/scans');
 * if (isErrorResponse(response)) {
 *   console.error('Error:', response.error.code);
 * }
 */
export function isErrorResponse(response: unknown): response is ApiErrorResponse {
  return (
    typeof response === 'object' &&
    response !== null &&
    'error' in response &&
    typeof (response as ApiErrorResponse).error === 'object' &&
    (response as ApiErrorResponse).error !== null &&
    typeof (response as ApiErrorResponse).error.code === 'string'
  );
}

/**
 * 判断响应是否为成功响应（非错误响应）
 * 
 * @param response - API 响应对象
 * @returns 如果是成功响应返回 true
 */
export function isSuccessResponse(response: unknown): boolean {
  // 非对象或 null 不是成功响应
  if (typeof response !== 'object' || response === null) {
    return false;
  }
  
  // 如果有 error 字段，则不是成功响应
  if ('error' in response) {
    return false;
  }
  
  return true;
}

/**
 * 判断响应是否为旧版格式
 * 
 * @param response - API 响应对象
 * @returns 如果是旧版格式返回 true
 */
export function isLegacyResponse<T = unknown>(
  response: unknown
): response is LegacyApiResponse<T> {
  return (
    typeof response === 'object' &&
    response !== null &&
    'state' in response &&
    'code' in response &&
    typeof (response as LegacyApiResponse).state === 'string'
  );
}

/**
 * 判断旧版响应是否为错误
 * 
 * @param response - 旧版 API 响应对象
 * @returns 如果是错误响应返回 true
 */
export function isLegacyErrorResponse<T = unknown>(
  response: LegacyApiResponse<T>
): boolean {
  return response.state !== 'success';
}

/**
 * 从响应中解析数据
 * 
 * 注意：新格式下，service 层返回的已经是最终数据（后端直接返回，无包装）
 * 此函数主要用于：
 * - 检查是否为错误响应
 * - 兼容旧格式 { state: 'success', data: T }
 * 
 * @param response - API 响应对象（通常已经是最终数据）
 * @returns 解析出的数据，如果是错误响应则返回 null
 * 
 * @example
 * const response = await quickScan(data);
 * const data = parseResponse<QuickScanResponse>(response);
 * if (data) {
 *   console.log('Scan count:', data.count);
 * }
 */
export function parseResponse<T>(response: unknown): T | null {
  // 处理 null/undefined
  if (response === null || response === undefined) {
    return null;
  }
  
  // 处理错误响应 { error: { code, message } }
  if (isErrorResponse(response)) {
    return null;
  }
  
  // 处理旧格式响应 { state: 'success', data: T }
  if (isLegacyResponse<T>(response)) {
    if (isLegacyErrorResponse(response)) {
      return null;
    }
    return response.data ?? null;
  }
  
  // 新格式：response 本身就是数据（无包装）
  // service 层已经返回 res.data，所以这里直接返回 response
  return response as T;
}

/**
 * 从响应中获取错误码
 * 
 * 支持新旧两种响应格式：
 * - 新格式: { error: { code: 'ERROR_CODE' } }
 * - 旧格式: { state: 'error', code: '400' }
 * 
 * @param response - API 响应对象
 * @returns 错误码字符串，如果不是错误响应则返回 null
 * 
 * @example
 * const response = await api.delete('/scans/123');
 * const errorCode = getErrorCode(response);
 * if (errorCode) {
 *   toast.error(t(`errors.${errorCode}`));
 * }
 */
export function getErrorCode(response: unknown): string | null {
  // 处理新格式错误响应
  if (isErrorResponse(response)) {
    return response.error.code;
  }
  
  // 处理旧格式错误响应
  if (isLegacyResponse(response) && isLegacyErrorResponse(response)) {
    // 旧格式的 code 是 HTTP 状态码，不是错误码
    // 返回通用错误码
    return 'SERVER_ERROR';
  }
  
  return null;
}

/**
 * 从响应中获取错误消息（用于调试）
 * 
 * @param response - API 响应对象
 * @returns 错误消息字符串，如果不是错误响应则返回 null
 */
export function getErrorMessage(response: unknown): string | null {
  // 处理新格式错误响应
  if (isErrorResponse(response)) {
    return response.error.message ?? null;
  }
  
  // 处理旧格式错误响应
  if (isLegacyResponse(response) && isLegacyErrorResponse(response)) {
    return response.message;
  }
  
  return null;
}

/**
 * 分页响应元数据类型
 */
export interface PaginationMeta {
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/**
 * 从分页响应中获取元数据
 * 
 * @param response - API 分页响应对象 { results, total, page, pageSize, totalPages }
 * @returns 分页元数据，如果不是分页响应则返回 null
 */
export function getPaginationMeta(response: unknown): PaginationMeta | null {
  if (
    typeof response === 'object' &&
    response !== null &&
    'total' in response &&
    'page' in response
  ) {
    const r = response as Record<string, unknown>;
    return {
      total: r.total as number,
      page: r.page as number,
      pageSize: (r.pageSize ?? r.page_size) as number,
      totalPages: (r.totalPages ?? r.total_pages) as number,
    };
  }
  return null;
}
