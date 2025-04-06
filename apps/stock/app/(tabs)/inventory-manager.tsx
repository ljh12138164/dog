import { useCurrentUser } from '@/api/useAuth';
import { useLatestSensorData } from '@/api/useInventory';
import { Dashboard, OperationRecords, Reports } from '@/components/inventory';
import MaterialRequestList from '@/components/procurement/MaterialRequestList';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';
import { ActivityIndicator, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import Toast from 'react-native-toast-message';
import BlueWhiteSegmentedButtons from '../../components/common/BlueWhiteSegmentedButtons';

// 创建一个QueryClient实例
const queryClient = new QueryClient();

export default function InventoryManagerScreen() {
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  // 使用传感器数据API替代WebSocket
  const { data: sensorData, isLoading: isLoadingSensor } = useLatestSensorData();
  const { isLoading } = useCurrentUser();

  if (isLoading || isLoadingSensor) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007aff" />
        <Text>加载中...</Text>
      </View>
    );
  }

  // 从数组格式获取单个值
  const getTemperature = () => {
    if (!sensorData) return 0;
    if (Array.isArray(sensorData.temperature)) {
      return sensorData.temperature[0] || 0;
    }
    return sensorData.temperature || 0;
  };

  const getHumidity = () => {
    if (!sensorData) return 0;
    if (Array.isArray(sensorData.humidity)) {
      return sensorData.humidity[0] || 0;
    }
    return sensorData.humidity || 0;
  };

  const getLight = () => {
    if (!sensorData || !sensorData.light) return null;
    if (Array.isArray(sensorData.light)) {
      return sensorData.light[0];
    }
    return sensorData.light;
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard />;
      case 'events':
        return <OperationRecords />;
      case 'reports':
        return <Reports />;
      case 'list':
        return <MaterialRequestList />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <QueryClientProvider client={queryClient}>
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>库存管理系统</Text>
          {sensorData && (
            <View style={styles.environmentInfo}>
              <Text style={styles.environmentText}>温度: {getTemperature().toFixed(1)}°C</Text>
              <Text style={styles.environmentText}>湿度: {getHumidity().toFixed(1)}%</Text>
              {getLight() !== null && (
                <Text style={styles.environmentText}>光照: {getLight()}</Text>
              )}
            </View>
          )}
        </View>

        <BlueWhiteSegmentedButtons
          value={activeTab}
          onValueChange={setActiveTab}
          buttons={[
            { value: 'dashboard', label: '总览' },
            { value: 'list', label: '出库申请' },
            { value: 'events', label: '出入库操作' },
            // { value: 'reports', label: '报表' },
          ]}
          style={styles.segmentedButtons}
        />

        <View style={styles.content}>{renderContent()}</View>
        <Toast />
      </SafeAreaView>
    </QueryClientProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    paddingTop: 60,
    paddingBottom: 15,
    paddingHorizontal: 20,
    backgroundColor: '#ffffff',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
  },
  environmentInfo: {
    flexDirection: 'row',
    marginTop: 8,
    flexWrap: 'wrap',
  },
  environmentText: {
    fontSize: 14,
    color: '#666',
    marginRight: 15,
  },
  segmentedButtons: {
    marginBottom: 16,
  },
  content: {
    flex: 1,
  },
});
