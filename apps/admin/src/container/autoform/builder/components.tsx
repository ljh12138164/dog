import { CopyOutlined, DeleteOutlined } from '@ant-design/icons';
import { useSortable } from '@dnd-kit/sortable';
import { Button, Card, Checkbox, Form, Input, Select } from 'antd';
import { ComponentType, FieldType } from './types';

// 拖拽组件
export function DraggableComponent({ id, label, icon }: ComponentType) {
  const { attributes, listeners, setNodeRef, isDragging } = useSortable({
    id,
    data: {
      type: 'component',
      component: { id, label, icon },
    },
  });

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      className={`mb-3 cursor-grab ${isDragging ? 'opacity-50' : ''}`}
      style={{ touchAction: 'none' }}
    >
      <Card
        className="hover:shadow-lg transition-all duration-200 border border-gray-200 bg-white hover:border-blue-300"
        size="small"
        bordered={false}
        bodyStyle={{ padding: '14px' }}
      >
        <div className="flex items-center">
          <div className="mr-3 text-lg text-blue-500">{icon}</div>
          <div className="text-sm text-gray-700 font-medium">{label}</div>
        </div>
      </Card>
    </div>
  );
}

// 可排序的表单字段组件
export function SortableField({
  field,
  isSelected,
  onSelect,
}: {
  field: FieldType;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
    id: field.id,
    data: {
      type: 'field',
      field,
    },
  });

  const style: React.CSSProperties = {
    transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`mb-3 rounded-lg ${
        isSelected ? 'ring-2 ring-blue-500 z-10' : 'hover:ring-2 hover:ring-blue-200'
      } transition-all duration-200`}
    >
      <Card
        size="small"
        onClick={onSelect}
        className={`transition-shadow ${isSelected ? 'shadow-md' : 'hover:shadow-md'}`}
        bodyStyle={{ padding: '14px' }}
        bordered={isSelected}
      >
        <div className="flex justify-between items-center">
          <div className="font-medium text-gray-700">{field.label}</div>
          <div className="invisible group-hover:visible flex gap-2">
            <Button
              type="text"
              size="small"
              icon={<CopyOutlined className="text-gray-600 hover:text-blue-500" />}
            />
            <Button
              type="text"
              size="small"
              icon={<DeleteOutlined className="text-gray-600 hover:text-red-500" />}
            />
          </div>
        </div>
      </Card>
    </div>
  );
}

// 表单字段配置区域
export function FormFieldConfig({
  field,
  onUpdate,
  onRemove,
}: {
  field: FieldType;
  onUpdate: (field: FieldType) => void;
  onRemove: (id: string) => void;
}) {
  if (!field) return null;

  return (
    <div className="p-6">
      <Form layout="vertical" className="space-y-4">
        <Form.Item label={<span className="text-gray-700 font-medium">标签</span>} className="mb-3">
          <Input
            placeholder="请输入标签"
            value={field.label}
            onChange={e => onUpdate({ ...field, label: e.target.value })}
            className="w-full rounded-md hover:border-blue-400 focus:border-blue-500"
          />
        </Form.Item>

        <Form.Item
          label={<span className="text-gray-700 font-medium">输入框占位符</span>}
          className="mb-3"
        >
          <Input
            placeholder="请输入占位符"
            value={field.placeholder}
            onChange={e => onUpdate({ ...field, placeholder: e.target.value })}
            className="w-full rounded-md hover:border-blue-400 focus:border-blue-500"
          />
        </Form.Item>

        <Form.Item
          label={<span className="text-gray-700 font-medium">输入框类型</span>}
          className="mb-3"
        >
          <Select
            value={field.type === 'input' ? 'text' : field.type}
            onChange={value => onUpdate({ ...field, type: value })}
            className="w-full"
            dropdownStyle={{ padding: '8px', borderRadius: '8px' }}
            options={[
              { value: 'text', label: '文本' },
              { value: 'number', label: '数字' },
              { value: 'password', label: '密码' },
              { value: 'email', label: '邮箱' },
            ]}
          />
        </Form.Item>

        <Form.Item
          label={<span className="text-gray-700 font-medium">默认值</span>}
          className="mb-3"
        >
          <Input
            placeholder="请输入默认值"
            value={field.defaultValue}
            onChange={e => onUpdate({ ...field, defaultValue: e.target.value })}
            className="w-full rounded-md hover:border-blue-400 focus:border-blue-500"
          />
        </Form.Item>

        <Form.Item label={<span className="text-gray-700 font-medium">描述</span>} className="mb-3">
          <Input
            placeholder="请输入描述"
            value={field.description || ''}
            onChange={e => onUpdate({ ...field, description: e.target.value })}
            className="w-full rounded-md hover:border-blue-400 focus:border-blue-500"
          />
        </Form.Item>

        <div className="flex flex-col gap-2 mb-4 bg-gray-50 p-3 rounded-md">
          <Form.Item className="mb-0">
            <Checkbox
              checked={field.required}
              onChange={e => onUpdate({ ...field, required: e.target.checked })}
              className="text-gray-700"
            >
              必选字段
            </Checkbox>
          </Form.Item>
        </div>

        <Button
          danger
          onClick={() => onRemove(field.id)}
          className="w-full rounded-md hover:bg-red-600 hover:border-red-600 transition-colors duration-200"
        >
          删除
        </Button>
      </Form>
    </div>
  );
}
