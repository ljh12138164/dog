import * as React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { ArrayWrapperProps } from '@autoform/react';

export const ArrayWrapper: React.FC<ArrayWrapperProps> = ({
  label,
  children,
  field,
  onAddItem,
}) => {
  // 处理可能的文本节点
  const safeChildren = React.Children.map(children, child => {
    if (typeof child === 'string') {
      return <Text>{child}</Text>;
    }
    return child;
  });

  return (
    <View style={styles.container}>
      <Text style={styles.title}>
        {label}
        {field.required && <Text style={styles.required}> *</Text>}
      </Text>
      {field.fieldConfig?.description && (
        <Text style={styles.description}>{field.fieldConfig.description}</Text>
      )}
      <View style={styles.content}>{safeChildren}</View>
      <TouchableOpacity style={styles.addButton} onPress={onAddItem}>
        <Text style={styles.addButtonText}>添加项目</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
    width: '100%',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
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
  content: {
    width: '100%',
  },
  addButton: {
    backgroundColor: '#e6f7ff',
    borderColor: '#1890ff',
    borderWidth: 1,
    borderRadius: 4,
    padding: 10,
    marginTop: 8,
    alignItems: 'center',
  },
  addButtonText: {
    color: '#1890ff',
    fontWeight: '500',
  },
});
