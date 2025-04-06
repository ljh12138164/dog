import { useNavigation, useRoute } from '@react-navigation/native';
import { format } from 'date-fns';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  Badge,
  Button,
  Card,
  Chip,
  Dialog,
  Divider,
  IconButton,
  Menu,
  Paragraph,
  Portal,
  Searchbar,
  TextInput,
  Title,
} from 'react-native-paper';
import Toast from 'react-native-toast-message';
import {
  ProcurementPlan,
  useApproveProcurementPlan,
  useProcurementPlans,
  useRejectProcurementPlan,
} from '../../api/useProcurement';

const ProcurementPlanList = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string | null>(
    // @ts-ignore
    route.params?.filter || null,
  );
  const [menuVisible, setMenuVisible] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<ProcurementPlan | null>(null);
  const [rejectDialogVisible, setRejectDialogVisible] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  // 获取采购计划数据
  const { data: plans, isLoading, refetch } = useProcurementPlans();

  // 批准和拒绝的操作
  const approveMutation = useApproveProcurementPlan(Toast);
  const rejectMutation = useRejectProcurementPlan(Toast);

  // 处理刷新
  const onRefresh = () => {
    setRefreshing(true);
    refetch().finally(() => setRefreshing(false));
  };

  // 过滤数据
  const filteredPlans = plans
    ?.filter(plan => {
      // 状态过滤
      if (filterStatus && plan.status !== filterStatus) {
        return false;
      }

      // 搜索过滤
      if (
        searchQuery &&
        !plan.title.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !plan.description.toLowerCase().includes(searchQuery.toLowerCase())
      ) {
        return false;
      }

      return true;
    })
    .sort((a, b) => {
      // 按创建时间排序，最新的在前面
      return new Date(b.created_at || '').getTime() - new Date(a.created_at || '').getTime();
    });

  // 处理批准计划
  const handleApprovePlan = (plan: ProcurementPlan) => {
    if (plan.id) {
      approveMutation.mutate(plan.id, {
        onSuccess: () => {
          refetch();
        },
      });
    }
  };

  // 处理拒绝计划
  const handleRejectPlan = () => {
    if (selectedPlan?.id && rejectReason.trim()) {
      rejectMutation.mutate(
        { id: selectedPlan.id, reason: rejectReason },
        {
          onSuccess: () => {
            setRejectDialogVisible(false);
            setRejectReason('');
            refetch();
          },
        },
      );
    }
  };

  // 处理长按计划
  const handlePlanLongPress = (plan: ProcurementPlan) => {
    setSelectedPlan(plan);
    setMenuVisible(true);
  };

  // 处理查看计划详情
  const handleViewPlanDetails = (plan: ProcurementPlan) => {
    // @ts-ignore
    navigation.navigate('ProcurementPlanDetail', { planId: plan.id });
  };

  // 添加新计划
  const handleAddNewPlan = () => {
    // @ts-ignore
    navigation.navigate('ProcurementPlanForm');
  };

  // 获取状态标签
  const getStatusChip = (status: string) => {
    let color = '';
    let label = '';

    switch (status) {
      case 'draft':
        color = '#95a5a6';
        label = '草稿';
        break;
      case 'pending':
        color = '#f39c12';
        label = '待审批';
        break;
      case 'approved':
        color = '#2ecc71';
        label = '已批准';
        break;
      case 'completed':
        color = '#3498db';
        label = '已完成';
        break;
      case 'rejected':
        color = '#e74c3c';
        label = '已拒绝';
        break;
      default:
        color = '#95a5a6';
        label = '未知';
    }

    return <Chip style={{ backgroundColor: color, marginRight: 8 }}>{label}</Chip>;
  };

  // 渲染列表项
  const renderItem = ({ item }: { item: ProcurementPlan }) => (
    <TouchableOpacity
      onPress={() => handleViewPlanDetails(item)}
      onLongPress={() => handlePlanLongPress(item)}
    >
      <Card style={styles.card}>
        <Card.Content>
          <View style={styles.headerRow}>
            <Title style={styles.title}>{item.title}</Title>
            {getStatusChip(item.status)}
          </View>
          <Paragraph numberOfLines={2} style={styles.description}>
            {item.description}
          </Paragraph>
          <Divider style={styles.divider} />
          <View style={styles.infoRow}>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>开始日期</Text>
              <Text style={styles.infoValue}>
                {item.start_date ? format(new Date(item.start_date), 'yyyy-MM-dd') : '未设置'}
              </Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>结束日期</Text>
              <Text style={styles.infoValue}>
                {item.end_date ? format(new Date(item.end_date), 'yyyy-MM-dd') : '未设置'}
              </Text>
            </View>
          </View>
          <View style={styles.infoRow}>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>物料种类</Text>
              <Text style={styles.infoValue}>{item.total_items || 0} 种</Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>总预算</Text>
              <Text style={styles.infoValue}>￥{item.total_budget?.toFixed(2) || '0.00'}</Text>
            </View>
          </View>
          {item.status === 'pending' && (
            <View style={styles.actionRow}>
              <Button
                mode="contained"
                compact
                style={[styles.actionButton, { backgroundColor: '#2ecc71' }]}
                onPress={() => handleApprovePlan(item)}
                loading={approveMutation.isPending && selectedPlan?.id === item.id}
              >
                批准
              </Button>
              <Button
                mode="contained"
                compact
                style={[styles.actionButton, { backgroundColor: '#e74c3c' }]}
                onPress={() => {
                  setSelectedPlan(item);
                  setRejectDialogVisible(true);
                }}
              >
                拒绝
              </Button>
            </View>
          )}
        </Card.Content>
      </Card>
    </TouchableOpacity>
  );

  // 过滤状态标签
  const renderFilterTabs = () => (
    <View style={styles.filterContainer}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
        <TouchableOpacity
          style={[styles.filterTab, filterStatus === null && styles.activeFilterTab]}
          onPress={() => setFilterStatus(null)}
        >
          <Text style={[styles.filterText, filterStatus === null && styles.activeFilterText]}>
            全部
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterTab, filterStatus === 'draft' && styles.activeFilterTab]}
          onPress={() => setFilterStatus('draft')}
        >
          <Text style={[styles.filterText, filterStatus === 'draft' && styles.activeFilterText]}>
            草稿
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterTab, filterStatus === 'pending' && styles.activeFilterTab]}
          onPress={() => setFilterStatus('pending')}
        >
          <Text style={[styles.filterText, filterStatus === 'pending' && styles.activeFilterText]}>
            待审批
          </Text>
          {plans && plans.filter(p => p.status === 'pending').length > 0 && (
            <Badge style={styles.filterBadge} size={16}>
              {plans.filter(p => p.status === 'pending').length}
            </Badge>
          )}
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterTab, filterStatus === 'approved' && styles.activeFilterTab]}
          onPress={() => setFilterStatus('approved')}
        >
          <Text style={[styles.filterText, filterStatus === 'approved' && styles.activeFilterText]}>
            已批准
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterTab, filterStatus === 'completed' && styles.activeFilterTab]}
          onPress={() => setFilterStatus('completed')}
        >
          <Text
            style={[styles.filterText, filterStatus === 'completed' && styles.activeFilterText]}
          >
            已完成
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterTab, filterStatus === 'rejected' && styles.activeFilterTab]}
          onPress={() => setFilterStatus('rejected')}
        >
          <Text style={[styles.filterText, filterStatus === 'rejected' && styles.activeFilterText]}>
            已拒绝
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Searchbar
          placeholder="搜索采购计划..."
          onChangeText={setSearchQuery}
          value={searchQuery}
          style={styles.searchBar}
          iconColor="#3498db"
          inputStyle={{ color: '#34495e' }}
        />
        <IconButton
          icon="plus"
          size={24}
          style={styles.addButton}
          iconColor="#ffffff"
          onPress={handleAddNewPlan}
        />
      </View>

      {renderFilterTabs()}

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3498db" />
          <Text style={styles.loadingText}>加载采购计划中...</Text>
        </View>
      ) : filteredPlans && filteredPlans.length > 0 ? (
        <FlatList
          data={filteredPlans}
          renderItem={renderItem}
          keyExtractor={item => item.id?.toString() || Math.random().toString()}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#3498db']} />
          }
        />
      ) : (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>
            {searchQuery || filterStatus
              ? '没有找到符合条件的采购计划'
              : '暂无采购计划，点击右上角添加'}
          </Text>
          {!searchQuery && !filterStatus && (
            <Button mode="contained" onPress={handleAddNewPlan} style={styles.emptyButton}>
              创建新采购计划
            </Button>
          )}
        </View>
      )}

      {/* 拒绝原因对话框 */}
      <Portal>
        <Dialog visible={rejectDialogVisible} onDismiss={() => setRejectDialogVisible(false)}>
          <Dialog.Title>拒绝原因</Dialog.Title>
          <Dialog.Content>
            <TextInput
              label="请输入拒绝原因"
              value={rejectReason}
              onChangeText={setRejectReason}
              multiline
              numberOfLines={3}
              style={styles.rejectInput}
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setRejectDialogVisible(false)} color="#7f8c8d">
              取消
            </Button>
            <Button
              onPress={handleRejectPlan}
              disabled={!rejectReason.trim() || rejectMutation.isPending}
              loading={rejectMutation.isPending}
              color="#e74c3c"
            >
              确认拒绝
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      {/* 长按菜单 */}
      <Portal>
        <Menu
          visible={menuVisible}
          onDismiss={() => setMenuVisible(false)}
          anchor={{ x: 0, y: 0 }}
          style={styles.menu}
        >
          <Menu.Item
            onPress={() => {
              setMenuVisible(false);
              if (selectedPlan) handleViewPlanDetails(selectedPlan);
            }}
            title="查看详情"
            leadingIcon="eye"
          />
          {selectedPlan?.status === 'pending' && (
            <>
              <Menu.Item
                onPress={() => {
                  setMenuVisible(false);
                  if (selectedPlan) handleApprovePlan(selectedPlan);
                }}
                title="批准"
                leadingIcon="check"
              />
              <Menu.Item
                onPress={() => {
                  setMenuVisible(false);
                  setRejectDialogVisible(true);
                }}
                title="拒绝"
                leadingIcon="close"
              />
            </>
          )}
          {selectedPlan?.status === 'draft' && (
            <Menu.Item
              onPress={() => {
                setMenuVisible(false);
                // @ts-ignore
                navigation.navigate('ProcurementPlanForm', { planId: selectedPlan.id });
              }}
              title="编辑"
              leadingIcon="pencil"
            />
          )}
        </Menu>
      </Portal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f7fa',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
    backgroundColor: '#ffffff',
    elevation: 2,
  },
  searchBar: {
    flex: 1,
    borderRadius: 8,
    backgroundColor: '#f8f9fa',
    elevation: 1,
  },
  addButton: {
    marginLeft: 8,
    backgroundColor: '#3498db',
    borderRadius: 8,
    elevation: 2,
  },
  filterContainer: {
    paddingHorizontal: 8,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#ecf0f1',
  },
  filterScroll: {
    flexDirection: 'row',
  },
  filterTab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f8f9fa',
    marginHorizontal: 4,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ecf0f1',
  },
  activeFilterTab: {
    backgroundColor: '#3498db',
    borderColor: '#3498db',
  },
  filterText: {
    color: '#7f8c8d',
    fontWeight: '500',
  },
  activeFilterText: {
    color: '#fff',
  },
  filterBadge: {
    backgroundColor: '#e74c3c',
    color: '#fff',
    marginLeft: 4,
  },
  listContent: {
    padding: 16,
  },
  card: {
    marginBottom: 16,
    borderRadius: 12,
    elevation: 2,
    backgroundColor: '#ffffff',
    borderLeftWidth: 4,
    borderLeftColor: '#3498db',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  title: {
    flex: 1,
    fontSize: 18,
    color: '#34495e',
  },
  description: {
    color: '#7f8c8d',
    marginBottom: 8,
    lineHeight: 20,
  },
  divider: {
    marginVertical: 8,
    backgroundColor: '#ecf0f1',
    height: 1,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  infoItem: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    color: '#95a5a6',
  },
  infoValue: {
    fontSize: 14,
    color: '#34495e',
    fontWeight: '500',
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 12,
  },
  actionButton: {
    marginLeft: 8,
    borderRadius: 6,
    elevation: 1,
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
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyText: {
    fontSize: 16,
    color: '#7f8c8d',
    textAlign: 'center',
    marginBottom: 24,
  },
  emptyButton: {
    backgroundColor: '#3498db',
    borderRadius: 8,
    elevation: 2,
  },
  menu: {
    borderRadius: 8,
    elevation: 3,
  },
  rejectInput: {
    backgroundColor: 'transparent',
  },
});

export default ProcurementPlanList;
