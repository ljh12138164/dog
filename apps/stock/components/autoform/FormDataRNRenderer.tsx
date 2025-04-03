import React from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';

interface FormDataRNRendererProps {
  data: Record<string, any>;
  onBack?: () => void;
}

/**
 * React Native表单数据渲染组件
 * 用于展示表单提交后的数据
 */
const FormDataRNRenderer: React.FC<FormDataRNRendererProps> = ({ data, onBack }) => {
  // 格式化显示数据的函数
  const formatValue = (value: any): string => {
    if (value === null || value === undefined) return '空';
    if (typeof value === 'boolean') return value ? '是' : '否';
    if (typeof value === 'object') return JSON.stringify(value, null, 2);
    return String(value);
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>表单提交数据</Text>
        {onBack && (
          <TouchableOpacity onPress={onBack} style={styles.backButton}>
            <Text style={styles.backButtonText}>返回表单</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.dataContainer}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>表单数据JSON格式：</Text>
          <ScrollView
            style={styles.jsonContainer}
            horizontal={true}
            showsHorizontalScrollIndicator={true}
          >
            <Text style={styles.jsonText}>{JSON.stringify(data, null, 2)}</Text>
          </ScrollView>
        </View>

        <View style={styles.divider} />

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>表单字段数据：</Text>
          <View style={styles.fieldsContainer}>
            {Object.entries(data).map(([key, value]) => (
              <View key={key} style={styles.fieldRow}>
                <Text style={styles.fieldKey}>{key}:</Text>
                <Text style={styles.fieldValue}>{formatValue(value)}</Text>
              </View>
            ))}
          </View>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  backButton: {
    padding: 6,
  },
  backButtonText: {
    color: '#1890ff',
    fontSize: 14,
  },
  dataContainer: {
    padding: 16,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  jsonContainer: {
    backgroundColor: '#f5f5f5',
    padding: 12,
    borderRadius: 4,
    maxHeight: 180,
  },
  jsonText: {
    fontFamily: 'monospace',
    fontSize: 12,
  },
  divider: {
    height: 1,
    backgroundColor: '#f0f0f0',
    marginVertical: 16,
  },
  fieldsContainer: {
    marginTop: 8,
  },
  fieldRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    paddingVertical: 8,
  },
  fieldKey: {
    width: 100,
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  fieldValue: {
    flex: 1,
    fontSize: 14,
    color: '#666',
  },
});

export default FormDataRNRenderer;
