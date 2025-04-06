import { format } from 'date-fns';
import React, { useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, View } from 'react-native';
import {
  Button,
  Card,
  Chip,
  Dialog,
  Divider,
  List,
  Paragraph,
  Portal,
  Text,
} from 'react-native-paper';
import { useMaterialRequestManagement } from '../../api/useOrdinary';
import BlueWhiteSegmentedButtons from '../common/BlueWhiteSegmentedButtons';

export default function InventoryOperations() {
  const {
    requests,
    isLoadingRequests,
    handleCompleteMaterialRequest,
    handleStartProcessingRequest,
    isCompleting,
    isStartingProcess,
  } = useMaterialRequestManagement();
  const [selectedRequest, setSelectedRequest] = useState<any | null>(null);
  const [visible, setVisible] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('all');

  const showRequestDetail = (request: any) => {
    setSelectedRequest(request);
    setVisible(true);
  };

  const hideDialog = () => {
    setVisible(false);
  };

  const completeRequest = async () => {
    if (!selectedRequest) return;

    try {
      await handleCompleteMaterialRequest(selectedRequest.id!);
      Alert.alert('成功', '出库申请已标记为已完成');
      hideDialog();
    } catch (error) {
      Alert.alert(
        '错误',
        `无法完成出库申请: ${error instanceof Error ? error.message : '未知错误'}`,
      );
    }
  };

  const startProcessingRequest = async () => {
    if (!selectedRequest) return;

    try {
      await handleStartProcessingRequest(selectedRequest.id!);
      Alert.alert('成功', '已开始处理出库申请');
      hideDialog();
    } catch (error: any) {
      console.error('处理出库申请错误:', error);

      let errorMessage = '处理申请时出错';

      if (error.response) {
        if (error.response.data && error.response.data.detail) {
          errorMessage = error.response.data.detail;
        }
      } else if (error.request) {
        errorMessage = '服务器没有响应，请检查网络连接';
      } else {
        errorMessage = error.message || '未知错误';
      }

      Alert.alert('操作失败', errorMessage, [
        {
          text: '关闭',
          style: 'cancel',
        },
      ]);
    }
  };

  const renderPriorityChip = (status: string) => {
    let color = '';
    let backgroundColor = '';
    let text = '';

    switch (status) {
      case 'pending':
        color = '#fff';
        backgroundColor = '#000000'; // 黑色
        text = '待处理';
        break;
      case 'approved':
        color = '#fff';
        backgroundColor = '#0088ff'; // 蓝色
        text = '已批准';
        break;
      case 'in_progress':
        color = '#fff';
        backgroundColor = '#000000'; // 黑色
        text = '处理中';
        break;
      case 'completed':
        color = '#fff';
        backgroundColor = '#0088ff'; // 蓝色
        text = '已完成';
        break;
      case 'rejected':
        color = '#fff';
        backgroundColor = '#000000'; // 黑色
        text = '已拒绝';
        break;
      default:
        color = '#fff';
        backgroundColor = '#000000'; // 黑色
        text = '未知';
    }

    return (
      <Chip style={{ backgroundColor }}>
        <Text style={{ color }}>{text}</Text>
      </Chip>
    );
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending':
        return '待处理';
      case 'approved':
        return '已批准';
      case 'in_progress':
        return '处理中';
      case 'completed':
        return '已完成';
      case 'rejected':
        return '已拒绝';
      default:
        return '未知';
    }
  };

  const filteredRequests = requests?.filter(request => {
    if (filterStatus === 'all') return true;
    if (filterStatus === 'to_process') return request.status === 'approved';
    if (filterStatus === 'in_progress') return request.status === 'in_progress';
    if (filterStatus === 'completed') return request.status === 'completed';
    return true;
  });

  if (isLoadingRequests) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0088ff" />
        <Text style={styles.loadingText}>加载出库申请中...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <Card style={styles.darkCard}>
        <Text style={styles.cardTitle}>我的出库任务</Text>
        <Text style={styles.subtitle}>
          {requests && requests.length > 0 ? `共 ${requests.length} 个出库申请` : '暂无出库申请'}
        </Text>

        <Divider style={styles.darkDivider} />

        <View style={styles.filterContainer}>
          <BlueWhiteSegmentedButtons
            value={filterStatus}
            onValueChange={setFilterStatus}
            buttons={[
              { value: 'all', label: '全部' },
              { value: 'to_process', label: '待处理' },
              { value: 'in_progress', label: '处理中' },
              { value: 'completed', label: '已完成' },
            ]}
            style={styles.segmentedButtons}
          />
        </View>
        <Card.Content>
          {!filteredRequests || filteredRequests.length === 0 ? (
            <Text style={styles.emptyText}>当前没有匹配条件的任务</Text>
          ) : (
            filteredRequests.map(request => (
              <View key={request.id} style={styles.operationItem}>
                <List.Item
                  title={<Text style={styles.operationTitle}>{request.title}</Text>}
                  description={
                    <View>
                      <Text style={styles.operationDesc}>
                        申请时间:{' '}
                        {request.created_at
                          ? format(new Date(request.created_at), 'yyyy-MM-dd HH:mm')
                          : '无'}
                      </Text>
                      <Text style={styles.operationDesc}>
                        申请人: {request.requested_by_name || '未知'}
                      </Text>
                      <Text style={styles.operationDesc}>
                        状态: {getStatusText(request.status)}
                      </Text>
                    </View>
                  }
                  left={props => <List.Icon {...props} icon="archive-outline" color="#0088ff" />}
                  right={props => (
                    <View style={styles.rightContent}>
                      {renderPriorityChip(request.status)}
                      <Button
                        mode="contained"
                        onPress={() => showRequestDetail(request)}
                        style={styles.detailButton}
                        labelStyle={{ fontSize: 12, color: '#fff' }}
                      >
                        查看详情
                      </Button>
                    </View>
                  )}
                />
                <Divider style={styles.darkDivider} />
              </View>
            ))
          )}
        </Card.Content>
      </Card>

      <Portal>
        <Dialog visible={visible} onDismiss={hideDialog} style={styles.dialog}>
          <Dialog.Title style={styles.dialogTitle}>{selectedRequest?.title}</Dialog.Title>
          <Dialog.Content>
            <Paragraph style={styles.dialogContent}>{selectedRequest?.notes}</Paragraph>
            <View style={styles.taskInfo}>
              <Text style={styles.taskInfoItem}>
                <Text style={styles.taskInfoLabel}>申请时间: </Text>
                {selectedRequest?.created_at
                  ? format(new Date(selectedRequest.created_at), 'yyyy-MM-dd HH:mm')
                  : '无'}
              </Text>
              <Text style={styles.taskInfoItem}>
                <Text style={styles.taskInfoLabel}>申请人: </Text>
                {selectedRequest?.requested_by_name || '未知'}
              </Text>
              <Text style={styles.taskInfoItem}>
                <Text style={styles.taskInfoLabel}>状态: </Text>
                {getStatusText(selectedRequest?.status)}
              </Text>
              <Text style={styles.taskInfoItem}>
                <Text style={styles.taskInfoLabel}>指派时间: </Text>
                {selectedRequest?.assigned_at
                  ? format(new Date(selectedRequest.assigned_at), 'yyyy-MM-dd HH:mm')
                  : '无'}
              </Text>
            </View>

            {selectedRequest?.items && selectedRequest.items.length > 0 && (
              <>
                <Text style={styles.itemsTitle}>申请物品:</Text>
                {selectedRequest.items.map((item: any, index: number) => (
                  <View key={item.id || index} style={styles.itemRow}>
                    <Text style={styles.itemName}>{item.ingredient_name}</Text>
                    <Text style={styles.itemQuantity}>
                      {item.quantity} {item.unit}
                    </Text>
                  </View>
                ))}
              </>
            )}
          </Dialog.Content>
          <Dialog.Actions style={styles.dialogActions}>
            <Button onPress={hideDialog} textColor="#000000">
              关闭
            </Button>
            {selectedRequest?.status === 'approved' && (
              <Button
                onPress={startProcessingRequest}
                loading={isStartingProcess}
                buttonColor="#0088ff"
                textColor="#ffffff"
                mode="contained"
              >
                开始处理
              </Button>
            )}
            {selectedRequest?.status === 'in_progress' && (
              <Button
                onPress={completeRequest}
                loading={isCompleting}
                buttonColor="#0088ff"
                textColor="#ffffff"
                mode="contained"
              >
                标记为已完成
              </Button>
            )}
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  loadingText: {
    marginTop: 10,
    color: '#000000',
  },
  card: {
    marginBottom: 16,
    backgroundColor: '#fff',
  },
  darkCard: {
    marginBottom: 16,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    elevation: 4,
    borderColor: '#0088ff',
    borderWidth: 1,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0088ff',
    marginBottom: 8,
    paddingHorizontal: 16,
  },
  darkSegmentedButtons: {
    marginBottom: 20,
    backgroundColor: '#fff',
    borderColor: '#000000',
  },
  input: {
    marginBottom: 12,
  },
  darkInput: {
    marginBottom: 12,
    backgroundColor: '#fff',
    borderRadius: 8,
    borderColor: '#000000',
    borderWidth: 1,
  },
  button: {
    marginTop: 16,
  },
  darkButton: {
    marginTop: 16,
    backgroundColor: '#0088ff',
    borderRadius: 25,
    paddingVertical: 8,
  },
  submitButton: {
    backgroundColor: '#0088ff',
  },
  segmentedButtons: {
    marginBottom: 12,
  },
  subtitle: {
    color: '#000000',
    fontSize: 14,
    marginTop: -4,
    marginBottom: 10,
    paddingHorizontal: 16,
  },
  darkDivider: {
    height: 1,
    backgroundColor: '#0088ff',
    marginVertical: 8,
  },
  operationItem: {
    marginBottom: 4,
  },
  operationContent: {
    flex: 1,
  },
  operationTitle: {
    color: '#000000',
    fontSize: 16,
    fontWeight: 'bold',
  },
  operationDesc: {
    color: '#000000',
    fontSize: 14,
  },
  emptyText: {
    textAlign: 'center',
    marginVertical: 20,
    fontSize: 16,
    color: '#000000',
  },
  rightContent: {
    flexDirection: 'column',
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: 8,
  },
  statusChip: {
    backgroundColor: '#0088ff',
    marginTop: 5,
  },
  detailButton: {
    marginTop: 5,
    backgroundColor: '#0088ff',
    color: '#fff',
  },
  dialog: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#0088ff',
  },
  dialogTitle: {
    color: '#0088ff',
    fontWeight: 'bold',
    textAlign: 'center',
  },
  dialogContent: {
    marginBottom: 16,
    color: '#000000',
  },
  dialogActions: {
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  taskInfo: {
    backgroundColor: '#fff',
    padding: 10,
    borderRadius: 4,
    borderColor: '#0088ff',
    borderWidth: 1,
  },
  taskInfoItem: {
    marginBottom: 4,
    color: '#000000',
  },
  taskInfoLabel: {
    fontWeight: 'bold',
    color: '#000000',
  },
  itemsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#0088ff',
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  itemName: {
    color: '#000000',
    fontSize: 14,
  },
  itemQuantity: {
    color: '#000000',
    fontSize: 14,
  },
  filterContainer: {
    paddingHorizontal: 16,
    paddingBottom: 10,
  },
});
