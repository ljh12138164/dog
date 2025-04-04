import * as React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { ObjectWrapperProps } from '@autoform/react';

export const ObjectWrapper: React.FC<ObjectWrapperProps> = ({ label, children, field }) => {
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
    backgroundColor: '#f5f5f5',
    borderRadius: 4,
    padding: 16,
  },
});
