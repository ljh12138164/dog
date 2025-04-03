import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { SegmentedButtons } from 'react-native-paper';
import InventoryOperations from '../../components/ordinary/InventoryOperations';
import TaskList from '../../components/ordinary/TaskList';
import FeedbackForm from '../../components/ordinary/FeedbackForm';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// 创建一个QueryClient实例
const queryClient = new QueryClient();

export default function OrdinaryUser() {
  const [activeTab, setActiveTab] = useState('inventory');

  const renderContent = () => {
    switch (activeTab) {
      case 'inventory':
        return <InventoryOperations />;
      case 'tasks':
        return <TaskList />;
      case 'feedback':
        return <FeedbackForm />;
      default:
        return <InventoryOperations />;
    }
  };

  return (
    <QueryClientProvider client={queryClient}>
      <View style={styles.container}>
        <SegmentedButtons
          value={activeTab}
          onValueChange={setActiveTab}
          buttons={[
            { value: 'inventory', label: '食材出入库' },
            { value: 'tasks', label: '待办任务' },
            { value: 'feedback', label: '异常反馈' },
          ]}
          style={styles.segmentedButtons}
        />
        <View style={styles.content}>{renderContent()}</View>
      </View>
    </QueryClientProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  segmentedButtons: {
    marginBottom: 16,
  },
  content: {
    flex: 1,
  },
});
