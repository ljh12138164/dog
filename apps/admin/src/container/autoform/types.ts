export type ComponentType = 'input' | 'select' | 'checkbox' | 'radio' | 'file' | 'daterange';

export interface FieldType {
  id: string;
  type: ComponentType;
  label: string;
  placeholder?: string;
  required: boolean;
  defaultValue?: any;
  options?: { label: string; value: string }[];
}

export const formComponents: { type: ComponentType; label: string; icon: string }[] = [
  { type: 'input', label: '输入框', icon: 'form' },
  { type: 'select', label: '单选框', icon: 'check-circle' },
  { type: 'checkbox', label: '复选框', icon: 'check-square' },
  { type: 'radio', label: '单选框', icon: 'radio' },
  { type: 'daterange', label: '日期选择器', icon: 'calendar' },
]; 