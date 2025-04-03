import React from 'react';
import { View, Text, TextInput, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';

interface FormRenderPreviewProps {
  fields: Array<{
    id: string;
    type: string;
    label: string;
    placeholder?: string;
    required?: boolean;
  }>;
  onSubmit?: (data: Record<string, any>) => void;
}

/**
 * React Native表单预览组件
 * 用于在移动端预览自动生成的表单
 */
const FormRenderPreview: React.FC<FormRenderPreviewProps> = ({ fields, onSubmit }) => {
  const [formData, setFormData] = React.useState<Record<string, any>>({});
  const [errors, setErrors] = React.useState<Record<string, string>>({});

  // 处理字段值改变
  const handleValueChange = (id: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [id]: value,
    }));

    // 清除错误
    if (errors[id]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[id];
        return newErrors;
      });
    }
  };

  // 提交表单
  const handleSubmit = () => {
    // 验证必填字段
    const newErrors: Record<string, string> = {};

    fields.forEach(field => {
      if (field.required && (!formData[field.id] || formData[field.id].trim() === '')) {
        newErrors[field.id] = `${field.label} 是必填项`;
      }
    });

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    // 提交数据
    if (onSubmit) {
      onSubmit(formData);
    }
  };

  // 渲染表单字段
  const renderField = (field: FormRenderPreviewProps['fields'][0]) => {
    switch (field.type) {
      case 'input':
      case 'text':
        return (
          <TextInput
            style={[styles.input, errors[field.id] ? styles.inputError : null]}
            placeholder={field.placeholder || '请输入'}
            value={formData[field.id] || ''}
            onChangeText={value => handleValueChange(field.id, value)}
          />
        );
      case 'number':
        return (
          <TextInput
            style={[styles.input, errors[field.id] ? styles.inputError : null]}
            placeholder={field.placeholder || '请输入数字'}
            keyboardType="numeric"
            value={formData[field.id] || ''}
            onChangeText={value => handleValueChange(field.id, value)}
          />
        );
      default:
        return (
          <TextInput
            style={[styles.input, errors[field.id] ? styles.inputError : null]}
            placeholder={field.placeholder || '请输入'}
            value={formData[field.id] || ''}
            onChangeText={value => handleValueChange(field.id, value)}
          />
        );
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>表单预览</Text>
      <Text style={styles.description}>下面是根据您的配置生成的表单预览</Text>

      <View style={styles.formContainer}>
        {fields.map(field => (
          <View key={field.id} style={styles.fieldContainer}>
            <View style={styles.labelContainer}>
              <Text style={styles.label}>{field.label}</Text>
              {field.required && <Text style={styles.required}>*</Text>}
            </View>
            {renderField(field)}
            {errors[field.id] && <Text style={styles.errorText}>{errors[field.id]}</Text>}
          </View>
        ))}

        <View style={styles.buttonContainer}>
          <TouchableOpacity style={styles.buttonCancel}>
            <Text style={styles.buttonCancelText}>取消</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.buttonSubmit} onPress={handleSubmit}>
            <Text style={styles.buttonSubmitText}>提交</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    color: '#666',
    marginBottom: 24,
  },
  formContainer: {
    marginTop: 8,
  },
  fieldContainer: {
    marginBottom: 16,
  },
  labelContainer: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
  },
  required: {
    color: 'red',
    marginLeft: 4,
  },
  input: {
    borderWidth: 1,
    borderColor: '#d9d9d9',
    borderRadius: 4,
    padding: 8,
    fontSize: 14,
  },
  inputError: {
    borderColor: 'red',
  },
  errorText: {
    color: 'red',
    fontSize: 12,
    marginTop: 4,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 24,
  },
  buttonCancel: {
    padding: 10,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#d9d9d9',
    borderRadius: 4,
    marginRight: 8,
  },
  buttonCancelText: {
    color: '#333',
  },
  buttonSubmit: {
    backgroundColor: '#1890ff',
    padding: 10,
    paddingHorizontal: 16,
    borderRadius: 4,
  },
  buttonSubmitText: {
    color: '#fff',
  },
});

export default FormRenderPreview;
