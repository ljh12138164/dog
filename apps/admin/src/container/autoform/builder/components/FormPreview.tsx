import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Typography, Space, Button } from 'antd';
import { DeleteOutlined, CopyOutlined } from '@ant-design/icons';
import { FieldType } from '../../types';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useDroppable } from '@dnd-kit/core';

const { Text } = Typography;

interface SortableFieldProps {
  field: FieldType;
  onSelect: (field: FieldType) => void;
  onDelete: (id: string) => void;
}

export const SortableField: React.FC<SortableFieldProps> = ({ field, onSelect, onDelete }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: field.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`border border-gray-100 rounded-sm mb-3 py-3 px-4 bg-white hover:bg-blue-50 ${
        isDragging ? 'opacity-50' : 'opacity-100'
      } ${isDragging ? 'cursor-grabbing' : 'cursor-pointer'} transition-colors duration-200 ease-in-out shadow-sm`}
      onClick={() => onSelect(field)}
      {...attributes}
      {...listeners}
    >
      <div className="flex justify-between items-center">
        <Text className="text-base font-medium">{field.label}</Text>
        <Space size="middle">
          <Button
            type="text"
            icon={<CopyOutlined className="text-blue-600" />}
            size="middle"
            onClick={e => {
              e.stopPropagation();
              // 处理复制功能
            }}
          />
          <Button
            type="text"
            danger
            icon={<DeleteOutlined />}
            size="middle"
            onClick={e => {
              e.stopPropagation();
              onDelete(field.id);
            }}
          />
        </Space>
      </div>
    </div>
  );
};

interface FormPreviewProps {
  id?: string;
  fields: FieldType[];
  onSelect: (field: FieldType) => void;
  onDelete: (id: string) => void;
  isOverDropArea?: boolean;
}

export const FormPreview: React.FC<FormPreviewProps> = ({
  id,
  fields,
  onSelect,
  onDelete,
  isOverDropArea = false,
}) => {
  const { setNodeRef } = useDroppable({
    id: id || 'form-preview',
  });

  return (
    <div
      ref={setNodeRef}
      className={`border ${
        fields.length === 0 ? 'border-dashed border-gray-300' : 'border-gray-100'
      } ${
        isOverDropArea ? 'bg-blue-50' : 'bg-gray-50'
      } rounded-md min-h-[500px] p-4 transition-colors duration-200 ease-in-out`}
    >
      {fields.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-[400px] text-gray-400">
          <div className="text-center p-6 bg-white rounded-md border border-dashed border-gray-300 w-[80%]">
            <Text className="text-lg">拖拽左侧组件到此区域创建表单</Text>
          </div>
        </div>
      ) : (
        <SortableContext items={fields.map(f => f.id)} strategy={verticalListSortingStrategy}>
          {fields.map(field => (
            <SortableField key={field.id} field={field} onSelect={onSelect} onDelete={onDelete} />
          ))}
        </SortableContext>
      )}
    </div>
  );
};

export default FormPreview;
