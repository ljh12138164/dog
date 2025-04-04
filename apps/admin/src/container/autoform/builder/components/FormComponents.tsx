import React from 'react';
import { useDraggable } from '@dnd-kit/core';
import { Space, Typography } from 'antd';
import {
  FormOutlined,
  CheckCircleOutlined,
  CheckSquareOutlined,
  FileOutlined,
  CalendarOutlined,
} from '@ant-design/icons';
import { formComponents } from '../../types';

const { Text } = Typography;

// 获取组件对应的图标
const getComponentIcon = (icon: string) => {
  switch (icon) {
    case 'form':
      return <FormOutlined />;
    case 'check-circle':
      return <CheckCircleOutlined />;
    case 'check-square':
      return <CheckSquareOutlined />;
    case 'radio':
      return <CheckCircleOutlined />;
    case 'file':
      return <FileOutlined />;
    case 'calendar':
      return <CalendarOutlined />;
    default:
      return <FormOutlined />;
  }
};

interface DraggableComponentProps {
  id: string;
  type: string;
  label: string;
  icon: string;
}

export const DraggableComponent: React.FC<DraggableComponentProps> = ({
  id,
  type,
  label,
  icon,
}) => {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id,
  });

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
      }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`border border-gray-100 rounded-sm mb-3 bg-white shadow-sm hover:bg-blue-50 transition-colors duration-200 ease-in-out ${
        transform ? 'cursor-grabbing z-50' : 'cursor-grab'
      }`}
      {...listeners}
      {...attributes}
    >
      <div className="p-3 flex items-center">
        <span className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-50 text-blue-600 mr-3">
          {getComponentIcon(icon)}
        </span>
        <Text className="text-base">{label}</Text>
      </div>
    </div>
  );
};

export const FormComponents: React.FC = () => {
  return (
    <div className="space-y-2">
      {formComponents.map(component => (
        <DraggableComponent
          key={component.type}
          id={`component-${component.type}`}
          type={component.type}
          label={component.label}
          icon={component.icon}
        />
      ))}
    </div>
  );
};

export default FormComponents;
