import * as React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { ArrayElementWrapperProps } from '@autoform/react';

export const ArrayElementWrapper: React.FC<ArrayElementWrapperProps> = ({
  index,
  children,
  onRemove,
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
      <View style={styles.indexBadge}>
        <Text style={styles.indexText}>{index + 1}</Text>
      </View>
      <View style={styles.content}>{safeChildren}</View>
      <TouchableOpacity style={styles.removeButton} onPress={onRemove}>
        <Text style={styles.removeButtonText}>删除</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderWidth: 1,
    borderColor: '#e8e8e8',
    borderRadius: 4,
    marginBottom: 12,
    padding: 12,
    backgroundColor: 'white',
  },
  indexBadge: {
    position: 'absolute',
    top: -10,
    left: 10,
    backgroundColor: '#1890ff',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
    zIndex: 1,
  },
  indexText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  content: {
    marginTop: 10,
    width: '100%',
  },
  removeButton: {
    alignSelf: 'flex-end',
    backgroundColor: '#fff1f0',
    borderColor: '#ff4d4f',
    borderWidth: 1,
    borderRadius: 4,
    padding: 6,
    marginTop: 8,
  },
  removeButtonText: {
    color: '#ff4d4f',
    fontSize: 12,
  },
});
