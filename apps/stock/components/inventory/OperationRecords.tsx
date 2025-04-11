import { format } from 'date-fns';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Button, Card, Chip, DataTable, Dialog, Divider, Portal } from 'react-native-paper';
import { InventoryOperation } from '../../api/types';
import { useInventoryOperationses } from '../../api/useInventory';

export default function OperationRecords() {
  const { data: operations = [], isLoading, refetch } = useInventoryOperationses();
  const [searchQuery, ] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [selectedOperation, setSelectedOperation] = useState<InventoryOperation | null>(null);
  const [detailsVisible, setDetailsVisible] = useState(false);
  const [filterType, setFilterType] = useState<'all' | 'in' | 'out'>('all');

  // 定义每页显示的记录数量和当前页
  const [page, setPage] = useState(0);
  const itemsPerPage = 10;

  // 根据搜索和筛选条件过滤数据
  const filteredOperations = operations.filter(op => {
    // 先按操作类型筛选
    if (filterType !== 'all' && op.operation_type !== filterType) {
      return false;
    }
    // 然后按关键词搜索
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        (op.ingredient_name && op.ingredient_name.toLowerCase().includes(query)) ||
        (op.notes && op.notes.toLowerCase().includes(query)) ||
        (op.operator_name && op.operator_name.toLowerCase().includes(query))
      );
    }
    return true;
  });

  // 计算分页显示的数据
  const paginatedOperations = filteredOperations.slice(
    page * itemsPerPage,
    (page + 1) * itemsPerPage,
  );

  // 刷新数据
  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  // 查看操作详情
  const showDetails = (operation: InventoryOperation) => {
    setSelectedOperation(operation);
    setDetailsVisible(true);
  };

  // 隐藏详情对话框
  const hideDetails = () => {
    setDetailsVisible(false);
    setSelectedOperation(null);
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0088ff" />
        <Text style={styles.loadingText}>加载操作记录中...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <Card style={styles.card}>
        <Card.Title
          title="出入库操作记录"
          subtitle={`共 ${operations.length} 条记录`}
          titleStyle={styles.cardTitle}
          subtitleStyle={styles.cardSubtitle}
        />

        <Card.Content>
          <View style={styles.chipContainer}>
            <Chip
              selected={filterType === 'all'}
              onPress={() => setFilterType('all')}
              style={[styles.chip, filterType === 'all' && styles.selectedChip]}
              textStyle={filterType === 'all' ? styles.selectedChipText : { color: '#000000' }}
            >
              全部
            </Chip>
            <Chip
              selected={filterType === 'in'}
              onPress={() => setFilterType('in')}
              style={[styles.chip, filterType === 'in' && styles.selectedChip]}
              textStyle={filterType === 'in' ? styles.selectedChipText : { color: '#000000' }}
            >
              入库
            </Chip>
            <Chip
              selected={filterType === 'out'}
              onPress={() => setFilterType('out')}
              style={[styles.chip, filterType === 'out' && styles.selectedChip]}
              textStyle={filterType === 'out' ? styles.selectedChipText : { color: '#000000' }}
            >
              出库
            </Chip>
          </View>

          <Divider style={styles.divider} />

          {paginatedOperations.length === 0 ? (
            <Text style={styles.emptyText}>没有符合条件的操作记录</Text>
          ) : (
            <DataTable style={styles.dataTable}>
              <DataTable.Header style={styles.tableHeader}>
                <DataTable.Title textStyle={styles.tableHeaderText}>食材</DataTable.Title>
                <DataTable.Title textStyle={styles.tableHeaderText}>操作类型</DataTable.Title>
                <DataTable.Title numeric textStyle={styles.tableHeaderText}>
                  数量
                </DataTable.Title>
                <DataTable.Title textStyle={styles.tableHeaderText}>操作员</DataTable.Title>
                <DataTable.Title textStyle={styles.tableHeaderText}>时间</DataTable.Title>
                <DataTable.Title textStyle={styles.tableHeaderText}>操作</DataTable.Title>
              </DataTable.Header>

              {paginatedOperations.map(operation => (
                <DataTable.Row key={operation.id} style={styles.tableRow}>
                  <DataTable.Cell textStyle={styles.tableCell}>
                    {operation.ingredient_name || '未知'}
                  </DataTable.Cell>
                  <DataTable.Cell>
                    <Chip
                      style={{
                        backgroundColor: operation.operation_type === 'in' ? '#E3F2FD' : '#FCE4EC',
                      }}
                      textStyle={{
                        color: '#000000',
                        fontWeight: 'bold',
                      }}
                    >
                      {operation.operation_type === 'in' ? '入库' : '出库'}
                    </Chip>
                  </DataTable.Cell>
                  <DataTable.Cell numeric textStyle={styles.tableCell}>
                    {operation.quantity}
                  </DataTable.Cell>
                  <DataTable.Cell textStyle={styles.tableCell}>
                    {operation.operator_name || '未知'}
                  </DataTable.Cell>
                  <DataTable.Cell textStyle={styles.tableCell}>
                    {operation.created_at
                      ? format(new Date(operation.created_at), 'MM-dd HH:mm')
                      : '未知'}
                  </DataTable.Cell>
                  <DataTable.Cell>
                    <Button
                      icon="eye"
                      mode="text"
                      compact
                      onPress={() => showDetails(operation)}
                      textColor="#0088ff"
                    >
                      详情
                    </Button>
                  </DataTable.Cell>
                </DataTable.Row>
              ))}

              <DataTable.Pagination
                page={page}
                numberOfPages={Math.ceil(filteredOperations.length / itemsPerPage)}
                onPageChange={setPage}
                label={`${page + 1}/${Math.ceil(filteredOperations.length / itemsPerPage)}`}
                theme={{ colors: { primary: '#0088ff' } }}
                // labelStyle={{ color: '#000000' }}
              />
            </DataTable>
          )}
        </Card.Content>
      </Card>

      {/* 详情对话框 */}
      <Portal>
        <Dialog visible={detailsVisible} onDismiss={hideDetails} style={styles.dialog}>
          <Dialog.Title style={styles.dialogTitle}>操作详情</Dialog.Title>
          <Dialog.Content>
            {selectedOperation && (
              <View style={styles.dialogContent}>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>食材：</Text>
                  <Text style={styles.detailValue}>
                    {selectedOperation.ingredient_name || '未知'}
                  </Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>操作类型：</Text>
                  <Chip
                    style={{
                      backgroundColor:
                        selectedOperation.operation_type === 'in' ? '#E3F2FD' : '#FCE4EC',
                    }}
                    textStyle={{
                      color: '#000000',
                      fontWeight: 'bold',
                    }}
                  >
                    {selectedOperation.operation_type === 'in' ? '入库' : '出库'}
                  </Chip>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>数量：</Text>
                  <Text style={styles.detailValue}>{selectedOperation.quantity}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>操作员：</Text>
                  <Text style={styles.detailValue}>
                    {selectedOperation.operator_name || '未知'}
                  </Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>检查人：</Text>
                  <Text style={styles.detailValue}>{selectedOperation.inspector_name || '无'}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>操作时间：</Text>
                  <Text style={styles.detailValue}>
                    {selectedOperation.created_at
                      ? format(new Date(selectedOperation.created_at), 'yyyy-MM-dd HH:mm:ss')
                      : '未知'}
                  </Text>
                </View>
                {selectedOperation.production_date && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>生产日期：</Text>
                    <Text style={styles.detailValue}>
                      {format(new Date(selectedOperation.production_date), 'yyyy-MM-dd')}
                    </Text>
                  </View>
                )}
                {selectedOperation.expiry_period && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>保质期：</Text>
                    <Text style={styles.detailValue}>{selectedOperation.expiry_period}</Text>
                  </View>
                )}
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>备注：</Text>
                  <Text style={styles.detailValue}>{selectedOperation.notes || '无'}</Text>
                </View>
              </View>
            )}
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={hideDetails} textColor="#0088ff">
              关闭
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </ScrollView>
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
    padding: 20,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#000000',
  },
  card: {
    margin: 16,
    borderRadius: 10,
    elevation: 2,
    backgroundColor: '#FFFFFF',
    borderColor: '#0088ff',
    borderWidth: 1,
  },
  cardTitle: {
    color: '#000000',
    fontWeight: 'bold',
  },
  cardSubtitle: {
    color: '#000000',
  },
  searchBar: {
    marginBottom: 16,
    backgroundColor: '#ffffff',
    elevation: 1,
    borderColor: '#0088ff',
    borderWidth: 1,
  },
  chipContainer: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  chip: {
    marginRight: 8,
    backgroundColor: '#ffffff',
    borderColor: '#0088ff',
    borderWidth: 1,
  },
  selectedChip: {
    backgroundColor: '#0088ff',
  },
  selectedChipText: {
    color: '#ffffff',
  },
  divider: {
    marginBottom: 16,
    backgroundColor: '#0088ff',
    height: 1,
  },
  emptyText: {
    textAlign: 'center',
    padding: 20,
    fontSize: 16,
    color: '#000000',
  },
  dataTable: {
    backgroundColor: '#ffffff',
  },
  tableHeader: {
    backgroundColor: '#E3F2FD',
  },
  tableHeaderText: {
    color: '#000000',
    fontWeight: 'bold',
  },
  tableRow: {
    borderBottomColor: '#E3F2FD',
    borderBottomWidth: 1,
  },
  tableCell: {
    color: '#000000',
  },
  dialog: {
    backgroundColor: '#ffffff',
    borderRadius: 10,
    borderColor: '#0088ff',
    borderWidth: 1,
  },
  dialogTitle: {
    color: '#000000',
    fontWeight: 'bold',
    textAlign: 'center',
  },
  dialogContent: {
    backgroundColor: '#ffffff',
  },
  detailRow: {
    flexDirection: 'row',
    marginBottom: 10,
    alignItems: 'center',
  },
  detailLabel: {
    fontWeight: 'bold',
    width: 80,
    color: '#000000',
  },
  detailValue: {
    flex: 1,
    color: '#000000',
  },
});
