import React, { useState } from 'react';
import {
  DndContext,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
  useSensor,
  useSensors,
  PointerSensor,
  DragOverEvent,
} from '@dnd-kit/core';
import { SortableContext, arrayMove, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Button, Modal, message } from 'antd';
import { FormComponents, FormPreview, FormSettings } from './components';
import { FieldType, ComponentType } from '../types';
import { generateZodCode, createZodProvider } from './utils';
import { AutoForm } from '@autoform/ant';
import { CopyOutlined } from '@ant-design/icons';

// 表单预览区域的ID
const FORM_PREVIEW_ID = 'form-preview-drop-area';

const AutoFormBuilder: React.FC = () => {
  const [fields, setFields] = useState<FieldType[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [selectedField, setSelectedField] = useState<FieldType | null>(null);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [codeVisible, setCodeVisible] = useState(false);
  const [generatedCode, setGeneratedCode] = useState('');
  const [isOverDropArea, setIsOverDropArea] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 10,
      },
    }),
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { over } = event;
    setIsOverDropArea(over?.id === FORM_PREVIEW_ID);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setIsOverDropArea(false);

    if (!over) return;

    if (active.id.toString().includes('component-')) {
      // 新组件拖放到表单
      if (over.id === FORM_PREVIEW_ID || fields.some(field => field.id === over.id)) {
        const type = active.id.toString().split('-')[1] as ComponentType;
        const newField: FieldType = {
          id: `field-${Date.now()}`,
          type,
          label: `${type}标签`,
          placeholder: `请输入${type}`,
          required: false,
          defaultValue: '',
        };

        setFields([...fields, newField]);
        message.success(`已添加${type}组件`);
      }
    } else if (active.id !== over.id) {
      // 已有组件排序
      const oldIndex = fields.findIndex(field => field.id === active.id);
      const newIndex = fields.findIndex(field => field.id === over.id);

      if (oldIndex !== -1 && newIndex !== -1) {
        setFields(arrayMove(fields, oldIndex, newIndex));
      }
    }

    setActiveId(null);
  };

  const handleSelectField = (field: FieldType) => {
    setSelectedField(field);
  };

  const handleUpdateField = (updatedField: FieldType) => {
    setFields(fields.map(field => (field.id === updatedField.id ? updatedField : field)));
  };

  const handleDeleteField = (id: string) => {
    setFields(fields.filter(field => field.id !== id));
    if (selectedField?.id === id) {
      setSelectedField(null);
    }
  };

  const handlePreview = () => {
    if (fields.length === 0) {
      message.warning('请先添加表单组件');
      return;
    }
    setPreviewVisible(true);
  };

  const handleGenerateCode = () => {
    if (fields.length === 0) {
      message.warning('请先添加表单组件');
      return;
    }
    const code = generateZodCode(fields);
    setGeneratedCode(code);
    setCodeVisible(true);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard
      .writeText(text)
      .then(() => {
        message.success('代码已复制到剪贴板');
      })
      .catch(() => {
        message.error('复制失败，请手动复制');
      });
  };

  return (
    <>
      <DndContext
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragOver={handleDragOver}
      >
        <div className="flex min-h-[calc(100vh-180px)] bg-gray-50">
          {/* 组件列表侧边栏 */}
          <div className="w-[250px] bg-white shadow-sm">
            <div className="py-3 px-4 border-b border-gray-100 bg-blue-50">
              <h2 className="text-lg font-medium text-blue-800">组件</h2>
            </div>
            <div className="py-3 px-3">
              <FormComponents />
            </div>
          </div>

          {/* 主体内容区 */}
          <div className="flex-1 p-6">
            <div className="flex flex-col bg-white rounded-md shadow-sm">
              {/* 表单预览标题栏 */}
              <div className="flex justify-between items-center py-3 px-5 border-b border-gray-100">
                <h2 className="text-lg font-medium">表单预览</h2>
                <div className="flex space-x-3">
                  <Button onClick={handlePreview}>预览</Button>
                  <Button onClick={handleGenerateCode} type="primary">
                    生成代码
                  </Button>
                </div>
              </div>

              {/* 表单内容区 */}
              <div className="flex p-5">
                {/* 表单预览区 */}
                <div className="flex-1 pr-5">
                  <FormPreview
                    id={FORM_PREVIEW_ID}
                    fields={fields}
                    onSelect={handleSelectField}
                    onDelete={handleDeleteField}
                    isOverDropArea={isOverDropArea}
                  />
                </div>

                {/* 表单配置区 */}
                <div className="w-[200px] border-l border-gray-100 pl-5">
                  <div className="pb-3 mb-3 border-b border-gray-100">
                    <h2 className="text-lg font-medium">表单配置</h2>
                  </div>
                  {selectedField ? (
                    <FormSettings selectedField={selectedField} onUpdate={handleUpdateField} />
                  ) : (
                    <div className="flex items-center justify-center h-60 text-gray-400">
                      请先选择一个表单组件
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 拖拽时显示的组件 */}
        <DragOverlay>
          {activeId && activeId.toString().includes('component-') ? (
            <div className="px-4 py-3 bg-white border-2 border-blue-500 rounded shadow-md">
              {activeId.toString().split('-')[1]}组件
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* 预览模态框 */}
      <Modal
        title="表单预览"
        open={previewVisible}
        onCancel={() => setPreviewVisible(false)}
        width={800}
        footer={[
          <Button key="close" onClick={() => setPreviewVisible(false)}>
            关闭
          </Button>,
        ]}
      >
        {fields.length > 0 && (
          <div className="p-6 bg-gray-50 rounded">
            <AutoForm
              schema={createZodProvider(fields)}
              antFormProps={{
                layout: 'vertical',
                onFinish: values => {
                  console.log('表单数据:', values);
                  message.success('提交成功！');
                },
              }}
            >
              <div className="text-right mt-6">
                <Button type="primary" htmlType="submit">
                  提交
                </Button>
              </div>
            </AutoForm>
          </div>
        )}
      </Modal>

      {/* 代码生成模态框 */}
      <Modal
        title="生成的代码"
        open={codeVisible}
        onCancel={() => setCodeVisible(false)}
        width={850}
        footer={[
          <Button
            key="copy"
            type="primary"
            icon={<CopyOutlined />}
            onClick={() => copyToClipboard(generatedCode)}
          >
            复制代码
          </Button>,
          <Button key="close" onClick={() => setCodeVisible(false)}>
            关闭
          </Button>,
        ]}
      >
        <pre className="bg-gray-50 p-5 rounded text-sm leading-6 max-h-[500px] overflow-auto">
          {generatedCode}
        </pre>
      </Modal>
    </>
  );
};

export default AutoFormBuilder;
