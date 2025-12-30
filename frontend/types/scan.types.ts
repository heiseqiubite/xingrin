/**
 * Scan task status enum
 * Consistent with backend ScanStatus
 */
export type ScanStatus = "cancelled" | "completed" | "failed" | "initiated" | "running"

/**
 * Scan stage (dynamic, from engine_config key)
 */
export type ScanStage = string

/**
 * Stage progress status
 */
export type StageStatus = "pending" | "running" | "completed" | "failed" | "cancelled"

/**
 * Single stage progress info
 */
export interface StageProgressItem {
  status: StageStatus
  order: number          // Execution order (starting from 0)
  startedAt?: string     // ISO time string
  duration?: number      // Execution duration (seconds)
  detail?: string        // Completion details
  error?: string         // Error message
  reason?: string        // Skip reason
}

/**
 * Stage progress dictionary (dynamic keys)
 */
export type StageProgress = Record<string, StageProgressItem>

export interface ScanRecord {
  id: number
  target?: number              // Target ID (corresponds to backend target)
  targetName: string           // Target name (corresponds to backend targetName)
  summary: {
    subdomains: number
    websites: number
    directories: number
    endpoints: number
    ips: number
    vulnerabilities: {
      total: number
      critical: number
      high: number
      medium: number
      low: number
    }
  }
  engine?: number              // Engine ID (corresponds to backend engine)
  engineName: string           // Engine name (corresponds to backend engineName)
  createdAt: string            // Creation time (corresponds to backend createdAt)
  status: ScanStatus
  errorMessage?: string        // Error message (corresponds to backend errorMessage, has value when failed)
  progress: number             // 0-100
  currentStage?: ScanStage     // Current scan stage (only has value in running status)
  stageProgress?: StageProgress // Stage progress details
}

export interface GetScansParams {
  page?: number
  pageSize?: number
  status?: ScanStatus
  search?: string
}

export interface GetScansResponse {
  results: ScanRecord[]        // Corresponds to backend results field
  total: number
  page: number
  pageSize: number
  totalPages: number
}

/**
 * Initiate scan request parameters (for existing target/organization)
 */
export interface InitiateScanRequest {
  organizationId?: number  // Organization ID (choose one)
  targetId?: number        // Target ID (choose one)
  engineId: number         // Scan engine ID (required)
}

/**
 * Quick scan request parameters (auto-create target and scan)
 */
export interface QuickScanRequest {
  targets: { name: string }[]  // Target list
  engineId: number             // Scan engine ID (required)
}

/**
 * Quick scan response
 */
export interface QuickScanResponse {
  count: number             // Number of scan tasks created
  targetStats: {
    created: number
    skipped: number
    failed: number
  }
  assetStats: {
    websites: number
    endpoints: number
  }
  errors: Array<{ input: string; error: string }>
  scans: ScanTask[]
}

/**
 * Single scan task info
 */
export interface ScanTask {
  id: number
  target: number           // Target ID
  engine: number           // Engine ID
  status: ScanStatus
  createdAt: string
  updatedAt: string
}

/**
 * Initiate scan response
 */
export interface InitiateScanResponse {
  message: string          // Success message
  count: number            // Number of scan tasks created
  scans: ScanTask[]        // Scan task list
}
