import React, { useState } from 'react';
import { ScrollView, StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { Title, Card, Button, Divider, Badge, ActivityIndicator } from 'react-native-paper';
import { useMaterialRequests } from '../../api/useProcurement';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';

// 出库流程步骤组件的Props类型
interface ProcessStepProps {
  title: string;
  isActive: boolean;
  isCompleted: boolean;
  isLast?: boolean;
}

// 出库流程步骤组件
const ProcessStep = ({ title, isActive, isCompleted, isLast = false }: ProcessStepProps) => {
  return (
    <View style={styles.processStep}>
      <View
        style={[
          styles.processIcon,
          isActive && styles.activeProcessIcon,
          isCompleted && styles.completedProcessIcon,
        ]}
      >
        {isCompleted ? (
          <MaterialIcons name="check" size={20} color="#fff" />
        ) : (
          <Text style={styles.processIconText}>{isActive ? '!' : ''}</Text>
        )}
      </View>
      <View style={styles.processTextContainer}>
        <Text style={[styles.processText, isActive && styles.activeProcessText]}>{title}</Text>
      </View>
      {!isLast && <View style={[styles.processLine, isCompleted && styles.completedProcessLine]} />}
    </View>
  );
};

const Dashboard = ({
  setActiveTab,
}: {
  setActiveTab: (tab: 'dashboard' | 'list' | 'create') => void;
}) => {
  const { data: requests, isLoading, error } = useMaterialRequests();
  const [selectedProcess, setSelectedProcess] = useState('all');

  // 计算各状态的申请数量
  const countByStatus = {
    pending: requests?.filter(req => req.status === 'pending').length || 0,
    approved: requests?.filter(req => req.status === 'approved').length || 0,
    in_progress: requests?.filter(req => req.status === 'in_progress').length || 0,
    completed: requests?.filter(req => req.status === 'completed').length || 0,
    rejected: requests?.filter(req => req.status === 'rejected').length || 0,
  };

  // 最近的出库申请
  const recentRequests = requests?.slice(0, 5).sort((a, b) => {
    // 安全处理可能的undefined值
    const dateA = a.requested_at ? new Date(a.requested_at).getTime() : 0;
    const dateB = b.requested_at ? new Date(b.requested_at).getTime() : 0;
    return dateB - dateA;
  });

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0088ff" />
        <Text style={styles.loadingText}>加载中...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.loadingContainer}>
        <MaterialIcons name="error-outline" size={48} color="#e74c3c" />
        <Text style={styles.errorText}>加载失败，请重试</Text>
      </View>
    );
  }

  // 状态显示文本映射
  const getStatusText = (status: string): string => {
    switch (status) {
      case 'pending':
        return '待审批';
      case 'approved':
        return '已批准';
      case 'in_progress':
        return '处理中';
      case 'completed':
        return '已完成';
      case 'rejected':
        return '已拒绝';
      default:
        return status;
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Title style={styles.mainTitle}>出库管理中心</Title>

      {/* 出库流程示意图 */}
      <Card style={styles.flowCard}>
        <Card.Content>
          <Text style={styles.cardTitle}>出库申请流程</Text>
          <View style={styles.processFlow}>
            <ProcessStep title="发出食材出库申请" isActive={true} isCompleted={false} />
            <ProcessStep title="将申请转给仓库管理员审批" isActive={false} isCompleted={false} />
            <ProcessStep
              title="仓库管理员接收申请，转给处理员工完成出库"
              isActive={false}
              isCompleted={false}
            />
            <ProcessStep
              title="仓库管理员记录数据，标记已完成出库"
              isActive={false}
              isCompleted={false}
              isLast={true}
            />
          </View>
        </Card.Content>
      </Card>

      {/* 最近申请列表 */}
      <Card style={styles.card}>
        <Card.Content>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>最近申请</Text>
            <Button
              mode="text"
              onPress={() => {
                /* 导航到申请列表 */
              }}
              labelStyle={styles.viewAllLabel}
            >
              查看全部
            </Button>
          </View>
          <Divider style={styles.divider} />

          {recentRequests && recentRequests.length > 0 ? (
            recentRequests.map((request, index) => (
              <View key={request.id}>
                <View style={styles.requestItem}>
                  <View style={styles.requestInfo}>
                    <Text style={styles.requestTitle}>{request.title}</Text>
                    <Text style={styles.requestMeta}>
                      申请人: {request.requested_by_name} | 日期:{' '}
                      {request.requested_at
                        ? new Date(request.requested_at).toLocaleDateString()
                        : '未知'}
                    </Text>
                  </View>
                  <Badge
                    style={[
                      styles.requestBadge,
                      request.status === 'pending' && styles.pendingBadge,
                      request.status === 'approved' && styles.approvedBadge,
                      request.status === 'in_progress' && styles.inProgressBadge,
                      request.status === 'completed' && styles.completedBadge,
                      request.status === 'rejected' && styles.rejectedBadge,
                    ]}
                  >
                    {getStatusText(request.status)}
                  </Badge>
                </View>
                {index < recentRequests.length - 1 && <Divider style={styles.itemDivider} />}
              </View>
            ))
          ) : (
            <Text style={styles.noDataText}>暂无申请记录</Text>
          )}
        </Card.Content>
      </Card>

      {/* 操作按钮 */}
      <View style={styles.actionButtons}>
        <Button
          mode="contained"
          icon="plus"
          onPress={() => {
            /* 导航到创建申请 */
            setActiveTab('create');
          }}
          style={styles.createButton}
        >
          新建出库申请
        </Button>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#f5f7fa',
  },
  mainTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#34495e',
    textAlign: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#7f8c8d',
  },
  errorText: {
    marginTop: 16,
    fontSize: 16,
    color: '#e74c3c',
  },
  card: {
    marginBottom: 16,
    elevation: 2,
    borderRadius: 12,
    backgroundColor: '#ffffff',
  },
  flowCard: {
    marginBottom: 16,
    padding: 8,
    elevation: 2,
    borderRadius: 12,
    backgroundColor: '#ffffff',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardTitle: {
    color: '#34495e',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  divider: {
    marginVertical: 12,
    backgroundColor: '#ecf0f1',
  },
  itemDivider: {
    marginVertical: 8,
    backgroundColor: '#ecf0f1',
  },
  statusContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginVertical: 16,
  },
  statusItem: {
    alignItems: 'center',
  },
  statusBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  statusLabel: {
    fontSize: 14,
    color: '#7f8c8d',
  },
  pendingBadge: {
    backgroundColor: '#f39c12',
  },
  approvedBadge: {
    backgroundColor: '#2ecc71',
  },
  inProgressBadge: {
    backgroundColor: '#3498db',
  },
  completedBadge: {
    backgroundColor: '#9b59b6',
  },
  rejectedBadge: {
    backgroundColor: '#e74c3c',
  },
  noDataText: {
    textAlign: 'center',
    fontSize: 16,
    color: '#7f8c8d',
    marginTop: 16,
    marginBottom: 16,
    fontStyle: 'italic',
  },
  requestItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  requestInfo: {
    flex: 1,
  },
  requestTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#34495e',
    marginBottom: 4,
  },
  requestMeta: {
    fontSize: 14,
    color: '#7f8c8d',
  },
  requestBadge: {
    marginLeft: 8,
  },
  processFlow: {
    marginTop: 16,
    marginBottom: 8,
  },
  processStep: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 30,
    position: 'relative',
  },
  processIcon: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#bdc3c7',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  activeProcessIcon: {
    backgroundColor: '#3498db',
  },
  completedProcessIcon: {
    backgroundColor: '#2ecc71',
  },
  processIconText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  processTextContainer: {
    flex: 1,
    paddingTop: 5,
  },
  processText: {
    fontSize: 16,
    color: '#7f8c8d',
  },
  activeProcessText: {
    color: '#3498db',
    fontWeight: 'bold',
  },
  processLine: {
    position: 'absolute',
    left: 15,
    top: 30,
    width: 2,
    height: 30,
    backgroundColor: '#bdc3c7',
  },
  completedProcessLine: {
    backgroundColor: '#2ecc71',
  },
  actionButtons: {
    marginTop: 8,
    marginBottom: 30,
  },
  createButton: {
    backgroundColor: '#0088ff',
    borderRadius: 25,
    height: 50,
    justifyContent: 'center',
  },
  viewAllLabel: {
    color: '#0088ff',
    fontSize: 14,
  },
});

export default Dashboard;
