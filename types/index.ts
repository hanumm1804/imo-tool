export type {
  User,
  Deal,
  DealPhase,
  TollgateItem,
  Workstream,
  Task,
  SynergyLine,
  RAIDEntry,
  DecisionEntry,
  ActionEntry,
  RiskEntry,
  PreAcquisitionLens,
  ResourceAllocation,
  IntegrationCharter,
  DealNarrative,
  AppAuditLog,
  AppSetting,
} from '@prisma/client'

export const Role = {
  ADMIN:    'ADMIN',
  IMO_LEAD: 'IMO_LEAD',
  VIEWER:   'VIEWER',
} as const
export type Role = typeof Role[keyof typeof Role]

export const DealStatus = {
  PRE_CLOSE:  'PRE_CLOSE',
  ACTIVE:     'ACTIVE',
  ON_HOLD:    'ON_HOLD',
  CLOSED:     'CLOSED',
  CANCELLED:  'CANCELLED',
} as const
export type DealStatus = typeof DealStatus[keyof typeof DealStatus]

export const RAGStatus = {
  GREEN: 'GREEN',
  AMBER: 'AMBER',
  RED:   'RED',
  GRAY:  'GRAY',
} as const
export type RAGStatus = typeof RAGStatus[keyof typeof RAGStatus]

export const PhaseStatus = {
  NOT_STARTED: 'NOT_STARTED',
  IN_PROGRESS: 'IN_PROGRESS',
  COMPLETE:    'COMPLETE',
} as const
export type PhaseStatus = typeof PhaseStatus[keyof typeof PhaseStatus]

export const TaskStatus = {
  NOT_STARTED: 'NOT_STARTED',
  IN_PROGRESS: 'IN_PROGRESS',
  COMPLETE:    'COMPLETE',
  BLOCKED:     'BLOCKED',
} as const
export type TaskStatus = typeof TaskStatus[keyof typeof TaskStatus]

export const Priority = {
  HIGH:   'HIGH',
  MEDIUM: 'MEDIUM',
  LOW:    'LOW',
} as const
export type Priority = typeof Priority[keyof typeof Priority]

export const SynergyCategory = {
  COST:    'COST',
  REVENUE: 'REVENUE',
} as const
export type SynergyCategory = typeof SynergyCategory[keyof typeof SynergyCategory]

export const RevenueBucket = {
  BUCKET_A: 'BUCKET_A',
  BUCKET_B: 'BUCKET_B',
  BUCKET_C: 'BUCKET_C',
} as const
export type RevenueBucket = typeof RevenueBucket[keyof typeof RevenueBucket]

export const SynergyStatus = {
  ON_TRACK: 'ON_TRACK',
  WATCH:    'WATCH',
  AT_RISK:  'AT_RISK',
} as const
export type SynergyStatus = typeof SynergyStatus[keyof typeof SynergyStatus]

export const BenefitsFunnelStage = {
  IDENTIFIED: 'IDENTIFIED',
  COMMITTED:  'COMMITTED',
  REALISED:   'REALISED',
} as const
export type BenefitsFunnelStage = typeof BenefitsFunnelStage[keyof typeof BenefitsFunnelStage]

export const RAIDType = {
  RISK:       'RISK',
  ACTION:     'ACTION',
  ISSUE:      'ISSUE',
  DEPENDENCY: 'DEPENDENCY',
} as const
export type RAIDType = typeof RAIDType[keyof typeof RAIDType]

export const LogStatus = {
  OPEN:        'OPEN',
  IN_PROGRESS: 'IN_PROGRESS',
  RESOLVED:    'RESOLVED',
  CLOSED:      'CLOSED',
} as const
export type LogStatus = typeof LogStatus[keyof typeof LogStatus]

export const RiskLevel = {
  HIGH:   'HIGH',
  MEDIUM: 'MEDIUM',
  LOW:    'LOW',
} as const
export type RiskLevel = typeof RiskLevel[keyof typeof RiskLevel]

export const LensStatus = {
  PASS: 'PASS',
  FAIL: 'FAIL',
  TBD:  'TBD',
} as const
export type LensStatus = typeof LensStatus[keyof typeof LensStatus]

export type ApiSuccess<T> = { data: T }
export type ApiError = { error: string; code: string }
export type ApiResponse<T> = ApiSuccess<T> | ApiError

export function isApiError(res: ApiResponse<unknown>): res is ApiError {
  return 'error' in res
}

export interface DashboardKPIs {
  totalDeals:      number
  activeDeals:     number
  dealsRed:        number
  synergyBaseline: number
  synergyRealised: number
  tollgatesDue:    number
  openRisks:       number
}

export interface DealSummaryStats {
  totalPeople: number
  totalTasks:  number
  tasksGreen:  number
  tasksRed:    number
}
