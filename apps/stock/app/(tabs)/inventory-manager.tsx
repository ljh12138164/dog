import { useCurrentUser } from '@/api/useAuth';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

// 导入库存管理组件
import { Dashboard, EventsManager, Reports } from '../../components/inventory';

export default function InventoryManagerScreen() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const { isLoading } = useCurrentUser();

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007aff" />
        <Text>加载中...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>库存管理系统</Text>
      </View>

      {/* 标签栏 */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'dashboard' && styles.activeTab]}
          onPress={() => setActiveTab('dashboard')}
        >
          <MaterialIcons
            name="dashboard"
            size={24}
            color={activeTab === 'dashboard' ? '#007aff' : '#555'}
          />
          <Text style={[styles.tabText, activeTab === 'dashboard' && styles.activeTabText]}>
            仪表盘
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'issues' && styles.activeTab]}
          onPress={() => setActiveTab('issues')}
        >
          <MaterialIcons
            name="warning"
            size={24}
            color={activeTab === 'issues' ? '#007aff' : '#555'}
          />
          <Text style={[styles.tabText, activeTab === 'issues' && styles.activeTabText]}>
            异常处理
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'reports' && styles.activeTab]}
          onPress={() => setActiveTab('reports')}
        >
          <MaterialIcons
            name="assessment"
            size={24}
            color={activeTab === 'reports' ? '#007aff' : '#555'}
          />
          <Text style={[styles.tabText, activeTab === 'reports' && styles.activeTabText]}>
            报告
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        {activeTab === 'dashboard' && <Dashboard />}
        {activeTab === 'issues' && <EventsManager />}
        {activeTab === 'reports' && <Reports />}
      </View>
    </View>
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
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  tabItem: {
    flex: 1,
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#007aff',
  },
  tabText: {
    marginLeft: 5,
    fontSize: 14,
    color: '#555',
  },
  activeTabText: {
    color: '#007aff',
    fontWeight: '500',
  },
  content: {
    flex: 1,
  },
});
