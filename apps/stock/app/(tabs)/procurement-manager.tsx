import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import BlueWhiteSegmentedButtons from '../../components/common/BlueWhiteSegmentedButtons';
import Dashboard from '../../components/procurement/Dashboard';
import MaterialRequestForm from '../../components/procurement/MaterialRequestForm';
import MaterialRequestList from '../../components/procurement/MaterialRequestList';

const queryClient = new QueryClient();

export default function ProcurementManager() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'list' | 'create'>('dashboard');

  return (
    <QueryClientProvider client={queryClient}>
      <View style={styles.container}>
        <BlueWhiteSegmentedButtons
          value={activeTab}
          onValueChange={value => setActiveTab(value as 'dashboard' | 'list' | 'create')}
          buttons={[
            { value: 'dashboard', label: '出库中心' },
            { value: 'list', label: '申请列表' },
            { value: 'create', label: '创建申请' },
          ]}
          style={styles.segmentedButtons}
        />

        {activeTab === 'dashboard' && <Dashboard setActiveTab={setActiveTab} />}
        {activeTab === 'list' && <MaterialRequestList />}
        {activeTab === 'create' && <MaterialRequestForm onSuccess={() => setActiveTab('list')} />}
      </View>
    </QueryClientProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f7fa',
  },
  segmentedButtons: {
    margin: 16,
    backgroundColor: '#fff',
  },
});
