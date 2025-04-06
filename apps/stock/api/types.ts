// 食材状态类型
export type IngredientStatus = 'normal' | 'low' | 'expired' | 'pending_check';

// 食材接口
export interface Ingredient {
  id: number;
  name: string;
  category: string;
  quantity: number;
  unit: string;
  location?: string;
  expiry_date?: string;
  last_check_date?: string;
  status: IngredientStatus;
}

// 出库申请状态类型
export type MaterialRequestStatus =
  | 'pending'
  | 'approved'
  | 'in_progress'
  | 'completed'
  | 'rejected';

// 出库申请接口
export interface MaterialRequest {
  id?: number;
  title: string;
  description?: string;
  requested_by?: number;
  requested_by_name?: string;
  requested_at?: string;
  status: MaterialRequestStatus;
  approved_by?: number;
  approved_by_name?: string;
  approved_at?: string;
  assigned_to?: number;
  assigned_to_name?: string;
  assigned_at?: string;
  completed_by?: number;
  completed_by_name?: string;
  completed_at?: string;
  items: MaterialRequestItem[];
}

// 出库申请项目接口
export interface MaterialRequestItem {
  id?: number;
  request_id?: number;
  ingredient_id: number;
  ingredient_name?: string;
  quantity: number;
  unit?: string;
  notes?: string;
}

// 库存操作类型
export type InventoryOperationType = 'in' | 'out';

// 库存操作接口
export interface InventoryOperation {
  id?: number;
  ingredient: number; // 食材ID
  ingredient_name?: string; // 食材名称（API返回）
  operation_type: InventoryOperationType;
  quantity: number; // 数量
  production_date?: string; // 生产日期
  expiry_period?: string; // 保质期
  operator?: number; // 操作员ID
  operator_name?: string; // 操作员名称（API返回）
  inspector?: number; // 入库检收人员ID
  inspector_name?: string; // 检收人员名称（API返回）
  notes?: string; // 备注
  source?: string; // 操作来源
  device_info?: string; // 设备信息
  ip_address?: string; // IP地址
  related_request?: number; // 关联出库申请ID
  created_at?: string; // 创建时间
}

// 采购计划状态类型
export type ProcurementPlanStatus =
  | 'draft'
  | 'pending'
  | 'approved'
  | 'in_progress'
  | 'completed'
  | 'canceled';

// 采购计划接口
export interface ProcurementPlan {
  id?: number;
  title: string;
  description?: string;
  created_by?: number;
  created_by_name?: string;
  created_at?: string;
  status: ProcurementPlanStatus;
  approved_by?: number;
  approved_by_name?: string;
  approved_at?: string;
  completed_by?: number;
  completed_by_name?: string;
  completed_at?: string;
  items: ProcurementPlanItem[];
  total_cost?: number;
}

// 采购计划项目接口
export interface ProcurementPlanItem {
  id?: number;
  plan_id?: number;
  ingredient_id: number;
  ingredient_name?: string;
  quantity: number;
  unit?: string;
  unit_price?: number;
  total_price?: number;
  supplier?: string;
  notes?: string;
}

// 任务类型
export type TaskType = 'check' | 'procurement' | 'inventory' | 'other';

// 任务优先级
export type TaskPriority = 'high' | 'medium' | 'low';

// 任务接口
export interface Task {
  id?: number;
  title: string;
  description?: string;
  status: string;
  task_type: TaskType;
  priority: TaskPriority;
  assigned_to?: number;
  assigned_to_name?: string;
  created_by?: number;
  created_by_name?: string;
  created_at?: string;
  due_date?: string;
  completed?: boolean;
  completed_at?: string;
}

// 反馈状态类型
export type FeedbackStatus = 'pending' | 'processing' | 'resolved';

// 反馈接口
export interface Feedback {
  id?: number;
  title: string;
  description: string;
  status?: FeedbackStatus;
  reporter?: number;
  reporter_name?: string;
  handler?: number;
  handler_name?: string;
  created_at?: string;
  updated_at?: string;
  resolved_at?: string | null;
  resolution_notes?: string;
  comments?: Array<{
    id: number;
    content: string;
    created_by_username: string;
    created_at: string;
  }>;
}
