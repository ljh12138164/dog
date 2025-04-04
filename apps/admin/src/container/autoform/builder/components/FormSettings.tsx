import { MinusCircleOutlined, PlusOutlined } from '@ant-design/icons';
import { Button, Divider, Form, Input, Switch, Typography } from 'antd';
import React, { useEffect, useState } from 'react';
import { FieldType } from '../../types';

const { Text } = Typography;

interface FormSettingsProps {
  selectedField: FieldType | null;
  onUpdate: (field: FieldType) => void;
}

export const FormSettings: React.FC<FormSettingsProps> = ({ selectedField, onUpdate }) => {
  const [form] = Form.useForm();
  const [currentField, setCurrentField] = useState<FieldType | null>(null);

  useEffect(() => {
    if (selectedField) {
      setCurrentField(selectedField);
      form.setFieldsValue({
        ...selectedField,
      });
    } else {
      setCurrentField(null);
      form.resetFields();
    }
  }, [selectedField, form]);

  const handleValuesChange = (_: any, allValues: any) => {
    if (!currentField) return;

    const updatedField: FieldType = {
      ...currentField,
      ...allValues,
    };

    setCurrentField(updatedField);
    onUpdate(updatedField);
  };

  return (
    <div className="bg-gray-50 p-4 rounded-md">
      <Form
        form={form}
        layout="vertical"
        onValuesChange={handleValuesChange}
        initialValues={currentField || undefined}
        className="text-base"
        size="middle"
      >
        <Form.Item
          label={<span className="text-gray-700 font-medium">标签文本</span>}
          name="label"
          rules={[{ required: true, message: '请输入标签' }]}
        >
          <Input className="text-base" />
        </Form.Item>

        {(currentField?.type === 'input' || currentField?.type === 'select') && (
          <Form.Item
            label={<span className="text-gray-700 font-medium">占位文本</span>}
            name="placeholder"
          >
            <Input className="text-base" />
          </Form.Item>
        )}

        <Form.Item
          label={<span className="text-gray-700 font-medium">是否必填</span>}
          name="required"
          valuePropName="checked"
        >
          <Switch />
        </Form.Item>

        {currentField?.type === 'input' && (
          <Form.Item
            label={<span className="text-gray-700 font-medium">默认值</span>}
            name="defaultValue"
          >
            <Input className="text-base" />
          </Form.Item>
        )}

        {(currentField?.type === 'select' || currentField?.type === 'radio') && (
          <>
            <Divider orientation="left" className="my-4" orientationMargin={0}>
              <span className="text-gray-700 font-medium">选项配置</span>
            </Divider>
            <Form.List name="options">
              {(fields, { add, remove }) => (
                <>
                  {fields.map(({ key, name, ...restField }) => (
                    <div key={key} className="mb-3 bg-white p-3 rounded-sm border border-gray-100">
                      <div className="flex justify-between mb-2">
                        <Text className="text-sm text-gray-500">选项 {name + 1}</Text>
                        <MinusCircleOutlined
                          onClick={() => remove(name)}
                          className="text-red-500"
                        />
                      </div>
                      <Form.Item
                        {...restField}
                        name={[name, 'label']}
                        rules={[{ required: true, message: '请输入选项名称' }]}
                        className="mb-2"
                      >
                        <Input placeholder="选项名称" className="text-base" />
                      </Form.Item>
                      <Form.Item
                        {...restField}
                        name={[name, 'value']}
                        rules={[{ required: true, message: '请输入选项值' }]}
                        className="mb-0"
                      >
                        <Input placeholder="选项值" className="text-base" />
                      </Form.Item>
                    </div>
                  ))}
                  <Form.Item>
                    <Button
                      type="dashed"
                      onClick={() => add({ label: '', value: '' })}
                      block
                      icon={<PlusOutlined />}
                      className="h-9"
                    >
                      添加选项
                    </Button>
                  </Form.Item>
                </>
              )}
            </Form.List>
          </>
        )}
      </Form>
    </div>
  );
};

export default FormSettings;
