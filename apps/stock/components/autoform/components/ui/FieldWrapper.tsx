import * as React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { FieldWrapperProps } from '@autoform/react';

const DISABLED_LABELS = ['boolean', 'object', 'array'];

export const FieldWrapper: React.FC<FieldWrapperProps> = ({
  label,
  error,
  children,
  id,
  field,
}) => {
  const isDisabled = DISABLED_LABELS.includes(field.type);
  // 确保没有直接的文本节点
  // 处理可能的文本节点，检查children是否为字符串
  const safeChildren = React.Children.map(children, child => {
    if (typeof child === 'string') {
      return <Text>{child}</Text>;
    }
    return child;
  });

  if (isDisabled) {
    return <>{safeChildren}</>;
  }

  return (
    <View style={styles.container}>
      <View style={styles.labelContainer}>
        <Text style={styles.label}>{label}</Text>
        {field.required && <Text style={styles.required}> *</Text>}
      </View>
      {field.fieldConfig?.description && (
        <Text style={styles.description}>{field.fieldConfig.description}</Text>
      )}
      {safeChildren}
      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 15,
    width: '100%',
  },
  labelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 8,
  },
  required: {
    color: 'red',
  },
  description: {
    fontSize: 12,
    color: '#666',
    marginBottom: 8,
  },
  errorText: {
    color: 'red',
    fontSize: 12,
    marginTop: 4,
  },
});
