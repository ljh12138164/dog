import { OperationRecords } from '@/components/inventory';
import Join from '@/components/ordinary/join';
import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import BlueWhiteSegmentedButtons from '../../components/common/BlueWhiteSegmentedButtons';
import FeedbackForm from '../../components/ordinary/FeedbackForm';
import { default as InventoryOperations } from '../../components/ordinary/InventoryOperations';
// 创建一个QueryClient实例

export default function OrdinaryUser() {
  const [activeTab, setActiveTab] = useState('join');

  const renderContent = () => {
    switch (activeTab) {
      case 'join':
        return <Join />;
      case 'feedback':
        return <FeedbackForm />;
      case 'inventory':
        return <OperationRecords />;
      default:
        return <InventoryOperations />;
    }
  };

  return (
    <View style={styles.container}>
      <BlueWhiteSegmentedButtons
        value={activeTab}
        onValueChange={setActiveTab}
        buttons={[
          { value: 'join', label: '入库操作' },
          { value: 'inventory', label: '食材出库任务' },
          { value: 'feedback', label: '异常反馈' },
        ]}
        style={styles.segmentedButtons}
      />
      <View style={styles.content}>{renderContent()}</View>
    </View>
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
