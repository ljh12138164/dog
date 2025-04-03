// 表单物料组件类型
export interface ComponentType {
  id: string;
  label: string;
  icon: string;
}

// 表单字段类型
export interface FieldType {
  id: string;
  type: string;
  label: string;
  placeholder: string;
  defaultValue: string;
  required: boolean;
  description?: string;
}

// 默认表单组件列表
export const formComponents: ComponentType[] = [
  { id: 'input', label: '输入框', icon: '📋' },
  { id: 'radio', label: '单选框', icon: '⚪' },
  { id: 'file', label: '文件', icon: '📄' },
  { id: 'select', label: '下拉框', icon: '▼' },
  { id: 'datepicker', label: '日期选择器', icon: '📅' },
  { id: 'textarea', label: '大文本', icon: '📝' },
]; 