import { CopyOutlined, ExportOutlined, EyeOutlined } from '@ant-design/icons';
import { AutoForm } from '@autoform/ant';
import {
  closestCenter,
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useDroppable,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { arrayMove, SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Button, Card, message, Modal, Space, Typography } from 'antd';
import { useCallback, useRef, useState } from 'react';
import { DraggableComponent, FormFieldConfig, SortableField } from './components';
import { ComponentType, FieldType, formComponents } from './types';
import { createZodProvider } from './utils';

const { Title, Text } = Typography;

export interface AutoFormBuilderProps {
  onGenerateCode?: (code: string) => void;
}

const AutoFormBuilder = () => {
  const [fields, setFields] = useState<FieldType[]>([]);
  const [selectedField, setSelectedField] = useState<FieldType | null>(null);
  const [previewMode, setPreviewMode] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const fieldIdCounter = useRef(1);
  const [draggedComponent, setDraggedComponent] = useState<ComponentType | null>(null);
  const [formData, setFormData] = useState<Record<string, any> | null>(null);
  const [showFormData, setShowFormData] = useState(false);

  // 设置拖拽传感器
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
  );

  // 处理拖拽开始
  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      const { active } = event;
      setActiveId(active.id as string);

      // 检查是否是从组件列表拖拽
      const isComponent = formComponents.some(comp => comp.id === active.id);
      if (isComponent) {
        const component = formComponents.find(comp => comp.id === active.id);
        if (component) {
          setDraggedComponent(component);
        }
      } else {
        const draggedField = fields.find(field => field.id === active.id);
        if (draggedField) {
          setSelectedField(draggedField);
        }
      }
    },
    [fields],
  );

  // 处理拖拽结束事件
  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      setActiveId(null);
      setDraggedComponent(null);

      if (!over) return;

      console.log('Drag end', { active, over });

      // 来自物料区的新组件，拖到设计区
      const isComponentDrag = formComponents.some(comp => comp.id === active.id);

      // 判断是否拖到了设计区域
      const isOverDesignArea =
        over.id === 'design-area' ||
        fields.length === 0 ||
        (typeof over.id === 'object' &&
          over.id &&
          'data-id' in over.id &&
          over.id['data-id'] === 'design-area') ||
        // 当设计区已有元素时，拖放到任何现有字段上也应视为有效
        fields.some(field => field.id === over.id);

      // 如果是从组件列表拖到设计区
      if (isComponentDrag && isOverDesignArea) {
        const componentType = active.id as string;
        const componentData = formComponents.find(comp => comp.id === componentType);

        if (componentData) {
          // 确保生成唯一ID
          const uniqueId = `${componentType}_${Date.now()}_${fieldIdCounter.current}`;
          const newField: FieldType = {
            id: uniqueId,
            type: componentType,
            label: `${componentData.label} ${fieldIdCounter.current}`,
            placeholder: '请输入',
            defaultValue: '',
            required: false,
          };

          console.log('Adding new field', newField);
          // 使用函数式更新确保获取最新状态
          setFields(prev => {
            const newFields = [...prev, newField];
            console.log('Updated fields', newFields);
            return newFields;
          });
          setSelectedField(newField);
          fieldIdCounter.current += 1;
        }
        return;
      }

      // 已有字段排序
      if (
        active.id !== over.id &&
        fields.some(field => field.id === active.id) &&
        fields.some(field => field.id === over.id)
      ) {
        setFields(items => {
          const oldIndex = items.findIndex(item => item.id === active.id);
          const newIndex = items.findIndex(item => item.id === over.id);

          return arrayMove(items, oldIndex, newIndex);
        });
      }
    },
    [fields],
  );

  // 处理表单提交
  const handleFormSubmit = useCallback(
    (data: Record<string, any>) => {
      // 创建一个新的对象用于存储转换后的数据
      const transformedData: Record<string, any> = {};

      // 遍历fields数组，查找对应的ID和标签
      fields.forEach(field => {
        if (data[field.id] !== undefined) {
          // 使用字段标签作为键，保留原始值
          transformedData[field.label] = data[field.id];
        }
      });

      // 同时保留原始数据以便调试
      transformedData._原始ID数据 = data;

      setFormData(transformedData);
      setShowFormData(true);

      // 显示提交成功的提示，并包含数据内容
      message.success('表单提交成功！');

      // 显示一个简单的弹窗展示提交的数据
      const dataStr = Object.entries(transformedData)
        .filter(([key]) => !key.startsWith('_'))
        .map(([key, value]) => `${key}: ${value}`)
        .join('\n');

      Modal.success({
        title: '表单提交成功',
        content: (
          <div>
            <p>您提交的数据：</p>
            <pre
              style={{
                maxHeight: '200px',
                overflow: 'auto',
                background: '#f5f5f5',
                padding: '8px',
                borderRadius: '4px',
              }}
            >
              {dataStr}
            </pre>
          </div>
        ),
      });
    },
    [fields],
  );

  // 处理返回表单编辑
  const handleBackToForm = useCallback(() => {
    setShowFormData(false);
  }, []);

  // 更新字段配置
  const updateField = useCallback((updatedField: FieldType) => {
    setFields(prev => prev.map(field => (field.id === updatedField.id ? updatedField : field)));
    setSelectedField(updatedField);
  }, []);

  // 移除字段
  const removeField = useCallback((fieldId: string) => {
    setFields(prev => prev.filter(field => field.id !== fieldId));
    setSelectedField(null);
  }, []);

  // 选择字段进行编辑
  const selectField = useCallback((field: FieldType) => {
    setSelectedField(field);
  }, []);

  // 生成预览
  const generatePreview = useCallback(() => {
    if (fields.length === 0) return null;

    const schemaProvider = createZodProvider(fields);

    return (
      <div className="p-16 border border-gray-200 rounded-lg bg-white">
        <div className="mb-8 pb-4 border-b border-gray-100">
          <Title level={4} className="mb-2 text-gray-800">
            表单预览
          </Title>
          <Text type="secondary">下面是根据您的配置生成的表单预览</Text>
        </div>
        <div className="max-w-2xl mx-auto">
          <AutoForm
            schema={schemaProvider}
            onSubmit={handleFormSubmit}
            // antFormProps={{
            //   layout: 'vertical',
            //   size: 'large',
            //   validateTrigger: 'onBlur',
            // }}
          >
            <div className="mt-8 flex justify-end">
              <Button type="default" className="mr-2">
                取消
              </Button>
              <Button type="primary" htmlType="submit" className="bg-blue-600 hover:bg-blue-700">
                提交
              </Button>
            </div>
          </AutoForm>
        </div>
      </div>
    );
  }, [fields, formData, showFormData, handleFormSubmit, handleBackToForm]);

  // 设计区域可放置区
  const { setNodeRef: setDesignAreaRef } = useDroppable({
    id: 'design-area',
  });

  return (
    <div className=" bg-gradient-to-b from-gray-50 to-gray-100 min-h-screen">
      {/* <div className="mb-8 flex justify-between items-center">
        <Title level={3} className="m-0 text-gray-800 font-semibold">
          表单构建器
        </Title>

        <Button
          type="primary"
          onClick={showCode}
          disabled={fields.length === 0}
          className="bg-blue-600 hover:bg-blue-700 h-10 flex items-center"
        >
          生成代码
        </Button>
      </div> */}

      <div className="flex justify-start items-center mb-6 bg-white p-3 rounded-lg shadow-md border border-gray-100 w-fit">
        <Space>
          <Button
            type={previewMode ? 'default' : 'primary'}
            onClick={() => {
              setPreviewMode(false);
              setShowFormData(false);
            }}
            icon={<ExportOutlined />}
            className={!previewMode ? 'bg-blue-500 hover:bg-blue-600' : ''}
          >
            编辑模式
          </Button>
          <Button
            type={previewMode ? 'primary' : 'default'}
            onClick={() => setPreviewMode(true)}
            icon={<EyeOutlined />}
            className={previewMode ? 'bg-blue-500 hover:bg-blue-600' : ''}
          >
            预览模式
          </Button>
        </Space>
      </div>

      {previewMode ? (
        <div className="bg-white p-6 rounded-lg shadow-md border border-gray-100">
          {generatePreview()}
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          collisionDetection={closestCenter}
        >
          <div className="flex gap-6">
            {/* 左侧物料区 */}
            <div className="w-52 flex-shrink-0">
              <Card
                title="表单配置"
                bordered={false}
                className="shadow-md rounded-lg overflow-hidden"
                headStyle={{
                  borderBottom: '1px solid #f0f0f0',
                  padding: '16px',
                  background: 'linear-gradient(to right, #f8fafc, #f1f5f9)',
                  fontWeight: 600,
                  color: '#334155',
                }}
                bodyStyle={{
                  padding: '16px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                  maxHeight: '70vh',
                  overflowY: 'auto',
                }}
              >
                {formComponents.map(comp => (
                  <DraggableComponent
                    key={comp.id}
                    id={comp.id}
                    label={comp.label}
                    icon={comp.icon}
                  />
                ))}
              </Card>
            </div>

            {/* 中间拖放区 */}
            <div className="flex-1" ref={setDesignAreaRef}>
              <Card
                title="表单设计"
                className="shadow-md rounded-lg overflow-hidden min-h-[600px]"
                headStyle={{
                  borderBottom: '1px solid #f0f0f0',
                  padding: '16px',
                  background: 'linear-gradient(to right, #f8fafc, #f1f5f9)',
                  fontWeight: 600,
                  color: '#334155',
                }}
                bodyStyle={{
                  minHeight: 500,
                  padding: '20px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '16px',
                  background: '#ffffff',
                  maxHeight: '70vh',
                  overflowY: 'auto',
                }}
              >
                {fields.length === 0 ? (
                  <div
                    className="flex flex-col justify-center items-center h-[400px] border-2 border-dashed border-blue-200 rounded-lg bg-gray-50 transition-all hover:border-blue-300"
                    data-id="design-area"
                  >
                    <div className="text-5xl text-blue-200 mb-4">
                      <ExportOutlined />
                    </div>
                    <Text type="secondary" className="text-base">
                      从左侧拖拽组件到此处
                    </Text>
                  </div>
                ) : (
                  <SortableContext
                    items={fields.map(field => field.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    {fields.map(field => (
                      <SortableField
                        key={field.id}
                        field={field}
                        isSelected={selectedField?.id === field.id}
                        onSelect={() => selectField(field)}
                      />
                    ))}
                  </SortableContext>
                )}
              </Card>
            </div>

            {/* 右侧配置区 */}
            <div className="w-72 flex-shrink-0 p-4">
              <Card
                title="属性配置"
                bordered={false}
                className="shadow-md rounded-lg overflow-hidden"
                headStyle={{
                  borderBottom: '1px solid #f0f0f0',
                  padding: '16px',
                  background: 'linear-gradient(to right, #f8fafc, #f1f5f9)',
                  fontWeight: 600,
                  color: '#334155',
                }}
                bodyStyle={{
                  padding: '8px',
                  background: '#ffffff',
                  maxHeight: '70vh',
                  overflowY: 'auto',
                }}
              >
                {selectedField ? (
                  <FormFieldConfig
                    field={selectedField}
                    onUpdate={updateField}
                    onRemove={removeField}
                  />
                ) : (
                  <div className="p-10 text-center flex flex-col items-center justify-center">
                    <div className="text-4xl text-gray-300 mb-4">
                      <CopyOutlined />
                    </div>
                    <Text type="secondary" className="text-base">
                      请选择一个组件进行配置
                    </Text>
                  </div>
                )}
              </Card>
            </div>
          </div>

          {/* 拖拽叠加层 */}
          <DragOverlay>
            {activeId && draggedComponent && (
              <Card
                className="w-52 cursor-grabbing shadow-xl border border-blue-200"
                size="small"
                bordered
              >
                <div className="flex items-center p-2">
                  <div className="mr-3 text-blue-500">{draggedComponent.icon}</div>
                  <div className="font-medium">{draggedComponent.label}</div>
                </div>
              </Card>
            )}
          </DragOverlay>
        </DndContext>
      )}
    </div>
  );
};

export default AutoFormBuilder;
