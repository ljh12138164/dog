import { useCurrentUser } from '@/api/useAuth';
import { format } from 'date-fns';
import React, { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import {
  ActivityIndicator,
  Badge,
  Button,
  Card,
  Dialog,
  Divider,
  Paragraph,
  Portal,
  RadioButton,
  Searchbar,
  Text,
} from 'react-native-paper';
import { MaterialRequest } from '../../api/types';
import {
  useApproveMaterialRequest,
  useAssignEmployeeToRequest,
  useCompleteMaterialRequest,
  useEmployees,
  useMaterialRequests,
  useRejectMaterialRequest,
  useStartProcessingMaterialRequest,
} from '../../api/useProcurement';

const MaterialRequestList = () => {
  const { data: requests, isLoading, error } = useMaterialRequests();
  const { data: employees, isLoading: isLoadingEmployees, error: employeesError } = useEmployees();
  const { data: user } = useCurrentUser();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRequest, setSelectedRequest] = useState<MaterialRequest | null>(null);
  const [dialogVisible, setDialogVisible] = useState(false);
  const [actionType, setActionType] = useState<string>('');
  const [assignDialogVisible, setAssignDialogVisible] = useState(false);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<number | null>(null);
  const [errorDialogVisible, setErrorDialogVisible] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const approveMutation = useApproveMaterialRequest();
  const rejectMutation = useRejectMaterialRequest();
  const startProcessingMutation = useStartProcessingMaterialRequest();
  const completeMutation = useCompleteMaterialRequest();
  const assignEmployeeMutation = useAssignEmployeeToRequest();

  const handleSearch = (query: string) => {
    setSearchQuery(query);
  };

  const filteredRequests = requests?.filter(
    request =>
      request.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      request.requested_by_name?.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const showDialog = (request: MaterialRequest, action: string) => {
    setSelectedRequest(request);
    setActionType(action);
    setDialogVisible(true);
  };

  const hideDialog = () => {
    setDialogVisible(false);
  };

  const showAssignDialog = () => {
    if (employeesError) {
      setErrorMessage('获取员工列表失败，您可能没有查看员工列表的权限');
      setErrorDialogVisible(true);
      return;
    }
    setAssignDialogVisible(true);
  };

  const hideAssignDialog = () => {
    setAssignDialogVisible(false);
    setSelectedEmployeeId(null);
  };

  const hideErrorDialog = () => {
    setErrorDialogVisible(false);
  };

  const handleAction = async () => {
    if (!selectedRequest?.id) return;

    try {
      switch (actionType) {
        case 'approve':
          const result = await approveMutation.mutateAsync(selectedRequest.id);
          hideDialog();
          showAssignDialog();
          break;
        case 'reject':
          await rejectMutation.mutateAsync(selectedRequest.id);
          hideDialog();
          break;
        case 'start':
          await startProcessingMutation.mutateAsync(selectedRequest.id);
          hideDialog();
          break;
        case 'complete':
          await completeMutation.mutateAsync(selectedRequest.id);
          hideDialog();
          break;
      }
    } catch (error) {
      console.error('操作失败:', error);
      hideDialog();
    }
  };

  const handleAssignEmployee = async () => {
    if (!selectedRequest?.id || !selectedEmployeeId) return;

    try {
      await assignEmployeeMutation.mutateAsync({
        requestId: selectedRequest.id,
        employeeId: selectedEmployeeId,
      });
      hideAssignDialog();
    } catch (error) {
      console.error('指派员工失败:', error);
    }
  };

  const getStatusText = (status: string) => {
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

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'pending':
        return styles.pendingBadge;
      case 'approved':
        return styles.approvedBadge;
      case 'in_progress':
        return styles.inProgressBadge;
      case 'completed':
        return styles.completedBadge;
      case 'rejected':
        return styles.rejectedBadge;
      default:
        return {};
    }
  };

  const getActionButtons = (request: MaterialRequest) => {
    switch (request.status) {
      case 'pending':
        if (user?.user_type !== 'logistics') return null;
        return (
          <View style={styles.actionButtons}>
            <Button
              mode="contained"
              onPress={() => showDialog(request, 'approve')}
              style={[styles.actionButton, styles.approveButton]}
              disabled={approveMutation.isPending}
            >
              批准
            </Button>
            <Button
              mode="contained"
              onPress={() => showDialog(request, 'reject')}
              style={[styles.actionButton, styles.rejectButton]}
              disabled={rejectMutation.isPending}
            >
              拒绝
            </Button>
          </View>
        );
      case 'approved':
        if (user?.user_type !== 'employee') return null;
        return (
          <Button
            mode="contained"
            onPress={() => showDialog(request, 'start')}
            style={[styles.actionButton, styles.startButton]}
            disabled={startProcessingMutation.isPending}
          >
            开始处理
          </Button>
        );
      case 'in_progress':
        if (user?.user_type !== 'employee') return null;
        return (
          <Button
            mode="contained"
            onPress={() => showDialog(request, 'complete')}
            style={[styles.actionButton, styles.completeButton]}
            disabled={completeMutation.isPending}
          >
            标记完成
          </Button>
        );
      default:
        return null;
    }
  };

  const getDialogContent = () => {
    if (!selectedRequest) return '';

    switch (actionType) {
      case 'approve':
        return `确定批准申请 "${selectedRequest.title}" 吗？`;
      case 'reject':
        return `确定拒绝申请 "${selectedRequest.title}" 吗？`;
      case 'start':
        return `确定开始处理申请 "${selectedRequest.title}" 吗？`;
      case 'complete':
        return `确定完成申请 "${selectedRequest.title}" 的处理吗？`;
      default:
        return '';
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0088ff" />
        <Text style={styles.loadingText}>加载申请列表中...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>加载失败，请重试</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Searchbar
        placeholder="搜索申请"
        onChangeText={handleSearch}
        value={searchQuery}
        style={styles.searchBar}
      />

      <ScrollView>
        {filteredRequests && filteredRequests.length > 0 ? (
          filteredRequests.map(request => (
            <Card key={request.id} style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={styles.titleContainer}>
                  <Text style={styles.title}>{request.title}</Text>
                  <Badge style={[styles.badge, getStatusStyle(request.status)]}>
                    {getStatusText(request.status)}
                  </Badge>
                </View>
              </View>

              <Card.Content>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>申请人:</Text>
                  <Text style={styles.infoValue}>{request.requested_by_name}</Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>申请时间:</Text>
                  <Text style={styles.infoValue}>
                    {request.requested_at
                      ? format(new Date(request.requested_at), 'yyyy-MM-dd HH:mm')
                      : '未知'}
                  </Text>
                </View>
                {request.description && (
                  <View style={styles.descriptionContainer}>
                    <Text style={styles.descriptionLabel}>说明:</Text>
                    <Text style={styles.description}>{request.description}</Text>
                  </View>
                )}

                <Divider style={styles.divider} />

                <Text style={styles.itemsTitle}>申请食材列表</Text>
                {request.items.map((item, index) => (
                  <View key={index} style={styles.itemRow}>
                    <View style={styles.itemInfo}>
                      <Text style={styles.itemName}>{item.ingredient_name}</Text>
                      <Text style={styles.itemDetails}>
                        数量: {item.quantity} {item.unit}
                        {item.notes ? ` | 备注: ${item.notes}` : ''}
                      </Text>
                    </View>
                  </View>
                ))}

                {getActionButtons(request)}
              </Card.Content>
            </Card>
          ))
        ) : (
          <Text style={styles.noDataText}>
            {searchQuery ? '没有找到匹配的申请' : '暂无申请记录'}
          </Text>
        )}
      </ScrollView>

      <Portal>
        <Dialog visible={dialogVisible} onDismiss={hideDialog}>
          <Dialog.Title>确认操作</Dialog.Title>
          <Dialog.Content>
            <Paragraph>{getDialogContent()}</Paragraph>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={hideDialog}>取消</Button>
            <Button
              onPress={handleAction}
              loading={
                approveMutation.isPending ||
                rejectMutation.isPending ||
                startProcessingMutation.isPending ||
                completeMutation.isPending
              }
            >
              确认
            </Button>
          </Dialog.Actions>
        </Dialog>

        <Dialog visible={assignDialogVisible} onDismiss={hideAssignDialog}>
          <Dialog.Title>指派处理员工</Dialog.Title>
          <Dialog.Content>
            {isLoadingEmployees ? (
              <ActivityIndicator style={{ margin: 20 }} />
            ) : employees && employees.length > 0 ? (
              <RadioButton.Group
                onValueChange={value => setSelectedEmployeeId(Number(value))}
                value={selectedEmployeeId?.toString() || ''}
              >
                {employees.map(employee => (
                  <View key={employee.id} style={styles.employeeItem}>
                    <RadioButton value={employee.id.toString()} />
                    <Text style={styles.employeeName}>{employee.username}</Text>
                  </View>
                ))}
              </RadioButton.Group>
            ) : (
              <Text style={styles.noDataText}>没有可用的员工</Text>
            )}
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={hideAssignDialog}>取消</Button>
            <Button
              onPress={handleAssignEmployee}
              disabled={!selectedEmployeeId || assignEmployeeMutation.isPending}
            >
              确定
            </Button>
          </Dialog.Actions>
        </Dialog>

        <Dialog visible={errorDialogVisible} onDismiss={hideErrorDialog}>
          <Dialog.Title>操作失败</Dialog.Title>
          <Dialog.Content>
            <Paragraph>{errorMessage}</Paragraph>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={hideErrorDialog}>确定</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#f5f7fa',
  },
  searchBar: {
    marginBottom: 16,
    elevation: 2,
    backgroundColor: '#ffffff',
  },
  card: {
    marginBottom: 16,
    borderRadius: 12,
    backgroundColor: '#ffffff',
    elevation: 2,
  },
  cardHeader: {
    padding: 16,
    paddingBottom: 8,
  },
  titleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#34495e',
    flex: 1,
  },
  badge: {
    marginLeft: 8,
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
  infoRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  infoLabel: {
    width: 80,
    color: '#7f8c8d',
    fontSize: 14,
  },
  infoValue: {
    color: '#34495e',
    fontSize: 14,
    flex: 1,
  },
  descriptionContainer: {
    marginTop: 8,
    marginBottom: 8,
  },
  descriptionLabel: {
    color: '#7f8c8d',
    fontSize: 14,
    marginBottom: 4,
  },
  description: {
    color: '#34495e',
    fontSize: 14,
  },
  divider: {
    marginVertical: 12,
    backgroundColor: '#ecf0f1',
  },
  itemsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#34495e',
    marginBottom: 8,
  },
  itemRow: {
    marginBottom: 8,
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 16,
    color: '#34495e',
  },
  itemDetails: {
    fontSize: 14,
    color: '#7f8c8d',
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  actionButton: {
    marginTop: 16,
    borderRadius: 25,
  },
  approveButton: {
    backgroundColor: '#2ecc71',
    flex: 1,
    marginRight: 8,
  },
  rejectButton: {
    backgroundColor: '#e74c3c',
    flex: 1,
    marginLeft: 8,
  },
  startButton: {
    backgroundColor: '#3498db',
  },
  completeButton: {
    backgroundColor: '#9b59b6',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#7f8c8d',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 16,
    color: '#e74c3c',
  },
  noDataText: {
    textAlign: 'center',
    fontSize: 16,
    color: '#7f8c8d',
    marginTop: 16,
    fontStyle: 'italic',
  },
  employeeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  employeeName: {
    fontSize: 16,
    marginLeft: 8,
  },
});

export default MaterialRequestList;
