import React, { useState } from 'react';
import {
  Table,
  Button,
  Space,
  Card,
  Tabs,
  Modal,
  Form,
  Select,
  Typography,
  Popconfirm,
  Tag,
  Drawer,
  List,
  Descriptions,
  Divider,
  Input,
  Empty,
  DatePicker,
  message,
} from 'antd';
import {
  CheckOutlined,
  CloseOutlined,
  EyeOutlined,
  UserAddOutlined,
  PlayCircleOutlined,
  CheckCircleOutlined,
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
} from '@ant-design/icons';
import {
  useMaterialRequests,
  useMaterialRequest,
  useApproveMaterialRequest,
  useRejectMaterialRequest,
  useStartProcessingMaterialRequest,
  useCompleteMaterialRequest,
  useAssignEmployeeToRequest,
  useEmployees,
  useInventoryOperations,
  useInventoryOperation,
  useCreateInventoryOperation,
  useUpdateInventoryOperation,
  useDeleteInventoryOperation,
  useIngredients,
  useCreateMaterialRequest,
  useUpdateMaterialRequest,
  useDeleteMaterialRequest,
  MaterialRequest,
  MaterialRequestItem,
  InventoryOperation,
  Ingredient,
} from '../../api/useStock';
import dayjs from 'dayjs';
import { useCurrentUser } from '../../api/useAuth';

const { Title, Text } = Typography;
const { TabPane } = Tabs;
const { Option } = Select;
const { TextArea } = Input;

const Stock = () => {
  // 获取当前用户信息
  const { data: currentUser } = useCurrentUser();

  // 出库申请数据相关状态
  const { data: materialRequests = [], isLoading: isLoadingRequests } = useMaterialRequests();
  const [selectedRequestId, setSelectedRequestId] = useState<number | null>(null);
  const { data: selectedRequest, isLoading: isLoadingRequestDetail } = useMaterialRequest(
    selectedRequestId || 0,
  );
  const [requestModalVisible, setRequestModalVisible] = useState(false);
  const [requestModalTitle, setRequestModalTitle] = useState<string>('');
  const [requestForm] = Form.useForm();
  const [requestItems, setRequestItems] = useState<any[]>([]);

  // 库存操作相关状态
  const { data: inventoryOperations = [], isLoading: isLoadingOperations } =
    useInventoryOperations();
  const [selectedOperationId, setSelectedOperationId] = useState<number | null>(null);
  const { data: selectedOperation } = useInventoryOperation(selectedOperationId || 0);
  const [operationModalVisible, setOperationModalVisible] = useState(false);
  const [operationModalTitle, setOperationModalTitle] = useState<string>('');
  const [operationForm] = Form.useForm();

  // 获取食材列表用于选择
  const { data: ingredients = [], isLoading: isLoadingIngredients } = useIngredients();

  // 库存操作CRUD相关hooks
  const createInventoryOperation = useCreateInventoryOperation();
  const updateInventoryOperation = useUpdateInventoryOperation();
  const deleteInventoryOperation = useDeleteInventoryOperation();

  // 出库申请CRUD相关hooks
  const createMaterialRequest = useCreateMaterialRequest();
  const updateMaterialRequest = useUpdateMaterialRequest();
  const deleteMaterialRequest = useDeleteMaterialRequest();

  // 员工相关状态
  const { data: employees = [], isLoading: isLoadingEmployees } = useEmployees();

  // 出库申请处理函数
  const approveMutation = useApproveMaterialRequest();
  const rejectMutation = useRejectMaterialRequest();
  const startProcessingMutation = useStartProcessingMaterialRequest();
  const completeMutation = useCompleteMaterialRequest();
  const assignEmployeeMutation = useAssignEmployeeToRequest();

  // UI状态
  const [activeTab, setActiveTab] = useState('requests');
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [assignModalVisible, setAssignModalVisible] = useState(false);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<number | null>(null);

  // 表单实例
  const [assignForm] = Form.useForm();

  // 处理标签切换
  const handleTabChange = (key: string) => {
    setActiveTab(key);
  };

  // 查看申请详情
  const viewRequestDetail = (requestId: number) => {
    setSelectedRequestId(requestId);
    setDrawerVisible(true);
  };

  // 关闭详情抽屉
  const closeDrawer = () => {
    setDrawerVisible(false);
    setSelectedRequestId(null);
  };

  // 打开员工指派模态框
  const showAssignModal = (requestId: number) => {
    setSelectedRequestId(requestId);
    setAssignModalVisible(true);
    assignForm.resetFields();
  };

  // 关闭员工指派模态框
  const closeAssignModal = () => {
    setAssignModalVisible(false);
    setSelectedEmployeeId(null);
  };

  // 处理申请审批
  const handleApprove = async (id: number) => {
    try {
      await approveMutation.mutateAsync(id);
      // 审批后直接打开指派员工模态框
      showAssignModal(id);
    } catch (error) {
      console.error('审批失败', error);
    }
  };

  // 处理申请拒绝
  const handleReject = async (id: number) => {
    try {
      await rejectMutation.mutateAsync(id);
    } catch (error) {
      console.error('拒绝失败', error);
    }
  };

  // 处理开始处理
  const handleStartProcessing = async (id: number) => {
    try {
      await startProcessingMutation.mutateAsync(id);
    } catch (error) {
      console.error('开始处理失败', error);
    }
  };

  // 处理完成
  const handleComplete = async (id: number) => {
    try {
      await completeMutation.mutateAsync(id);
    } catch (error) {
      console.error('完成处理失败', error);
    }
  };

  // 处理员工指派
  const handleAssignEmployee = async () => {
    try {
      const values = await assignForm.validateFields();
      if (selectedRequestId && values.employeeId) {
        await assignEmployeeMutation.mutateAsync({
          requestId: selectedRequestId,
          employeeId: values.employeeId,
        });
        closeAssignModal();
      }
    } catch (error) {
      console.error('指派员工失败', error);
    }
  };

  // 获取申请状态标签
  const getStatusTag = (status: string) => {
    const statusMap: Record<string, { color: string; text: string }> = {
      pending: { color: 'gold', text: '待审批' },
      approved: { color: 'blue', text: '已批准' },
      in_progress: { color: 'processing', text: '处理中' },
      completed: { color: 'success', text: '已完成' },
      rejected: { color: 'error', text: '已拒绝' },
    };

    const statusInfo = statusMap[status] || { color: 'default', text: status };

    return <Tag color={statusInfo.color}>{statusInfo.text}</Tag>;
  };

  // 新增出库申请
  const showAddRequestModal = () => {
    setRequestModalTitle('新建出库申请');
    setSelectedRequestId(null);
    requestForm.resetFields();
    setRequestItems([{ id: Date.now(), ingredient: undefined, quantity: 1, notes: '' }]);
    setRequestModalVisible(true);
  };

  // 编辑出库申请
  const handleEditRequest = (record: MaterialRequest) => {
    // 只允许编辑待审批状态的申请
    if (record.status !== 'pending') {
      message.warning('只能编辑待审批状态的申请');
      return;
    }

    setRequestModalTitle('编辑出库申请');
    setSelectedRequestId(record.id!);

    requestForm.setFieldsValue({
      title: record.title,
      description: record.description,
    });

    // 设置申请食材项
    if (record.items && record.items.length > 0) {
      const itemsWithId = record.items.map(item => ({
        ...item,
        id: Date.now() + Math.random(), // 添加唯一ID用于前端识别
        ingredient: item.ingredient,
        quantity: item.quantity,
        notes: item.notes,
      }));
      setRequestItems(itemsWithId);
    } else {
      setRequestItems([{ id: Date.now(), ingredient: undefined, quantity: 1, notes: '' }]);
    }

    setRequestModalVisible(true);
  };

  // 删除出库申请
  const handleDeleteRequest = async (id: number) => {
    try {
      await deleteMaterialRequest.mutateAsync(id);
    } catch (error) {
      console.error('删除申请失败', error);
    }
  };

  // 关闭出库申请模态框
  const closeRequestModal = () => {
    setRequestModalVisible(false);
    setSelectedRequestId(null);
    requestForm.resetFields();
    setRequestItems([]);
  };

  // 添加食材项
  const addRequestItem = () => {
    setRequestItems([
      ...requestItems,
      { id: Date.now(), ingredient: undefined, quantity: 1, notes: '' },
    ]);
  };

  // 移除食材项
  const removeRequestItem = (itemId: number) => {
    setRequestItems(requestItems.filter(item => item.id !== itemId));
  };

  // 更新食材项
  const updateRequestItem = (itemId: number, field: string, value: any) => {
    setRequestItems(
      requestItems.map(item => {
        if (item.id === itemId) {
          return { ...item, [field]: value };
        }
        return item;
      }),
    );
  };

  // 提交出库申请表单
  const handleRequestSubmit = async () => {
    try {
      const values = await requestForm.validateFields();

      // 检查是否有食材项
      if (requestItems.length === 0) {
        message.error('至少需要添加一项食材');
        return;
      }

      // 检查每个食材项是否完整
      const hasIncompleteItems = requestItems.some(item => !item.ingredient || !item.quantity);
      if (hasIncompleteItems) {
        message.error('请完整填写所有食材项');
        return;
      }

      // 准备提交数据
      const formData = {
        ...values,
        items: requestItems.map(item => ({
          ingredient: item.ingredient,
          quantity: item.quantity,
          notes: item.notes,
        })),
      };

      if (selectedRequestId) {
        // 更新操作
        await updateMaterialRequest.mutateAsync({
          id: selectedRequestId,
          data: {
            title: values.title,
            description: values.description,
          },
        });
        // 注意：当前API可能不支持直接更新items，需要单独处理
      } else {
        // 新增操作
        await createMaterialRequest.mutateAsync(formData);
      }

      closeRequestModal();
    } catch (error) {
      console.error('表单提交失败', error);
    }
  };

  // 出库申请表格列配置
  const requestColumns = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 80,
    },
    {
      title: '标题',
      dataIndex: 'title',
      key: 'title',
    },
    {
      title: '申请人',
      dataIndex: 'requested_by_name',
      key: 'requested_by_name',
    },
    {
      title: '申请时间',
      dataIndex: 'requested_at',
      key: 'requested_at',
      render: (text: string) => (text ? dayjs(text).format('YYYY-MM-DD HH:mm') : '-'),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => getStatusTag(status),
    },
    {
      title: '操作',
      key: 'action',
      render: (_: unknown, record: MaterialRequest) => {
        // 根据状态显示不同的操作按钮
        const actions = [];

        // 查看详情按钮（所有状态都显示）
        actions.push(
          <Button
            key="view"
            icon={<EyeOutlined />}
            onClick={() => viewRequestDetail(record.id!)}
            type="link"
          >
            查看
          </Button>,
        );

        // 编辑按钮（只对待审批状态显示）
        if (record.status === 'pending') {
          actions.push(
            <Button
              key="edit"
              icon={<EditOutlined />}
              onClick={() => handleEditRequest(record)}
              type="link"
            >
              编辑
            </Button>,
          );
        }

        // 删除按钮（作为管理员可以删除任何状态的申请）
        actions.push(
          <Popconfirm
            key="delete"
            title="确定要删除这个申请吗？"
            onConfirm={() => handleDeleteRequest(record.id!)}
            okText="确定"
            cancelText="取消"
          >
            <Button icon={<DeleteOutlined />} type="link" danger>
              删除
            </Button>
          </Popconfirm>,
        );

        // 审批和拒绝按钮（待审批状态）
        if (record.status === 'pending') {
          actions.push(
            <Popconfirm
              key="approve"
              title="确定要批准这个申请吗？"
              onConfirm={() => handleApprove(record.id!)}
              okText="确定"
              cancelText="取消"
            >
              <Button icon={<CheckOutlined />} type="link" style={{ color: '#1890ff' }}>
                批准
              </Button>
            </Popconfirm>,
          );

          actions.push(
            <Popconfirm
              key="reject"
              title="确定要拒绝这个申请吗？"
              onConfirm={() => handleReject(record.id!)}
              okText="确定"
              cancelText="取消"
            >
              <Button icon={<CloseOutlined />} type="link" danger>
                拒绝
              </Button>
            </Popconfirm>,
          );
        }

        // 指派员工按钮（已批准状态）
        if (record.status === 'approved' && !record.assigned_to) {
          actions.push(
            <Button
              key="assign"
              icon={<UserAddOutlined />}
              onClick={() => showAssignModal(record.id!)}
              type="link"
              style={{ color: '#722ed1' }}
            >
              指派员工
            </Button>,
          );
        }

        // 开始处理按钮（已批准+已指派状态）
        if (record.status === 'approved' && record.assigned_to) {
          actions.push(
            <Popconfirm
              key="start"
              title="确定要开始处理这个申请吗？"
              onConfirm={() => handleStartProcessing(record.id!)}
              okText="确定"
              cancelText="取消"
            >
              <Button icon={<PlayCircleOutlined />} type="link" style={{ color: '#389e0d' }}>
                开始处理
              </Button>
            </Popconfirm>,
          );
        }

        // 完成处理按钮（处理中状态）
        if (record.status === 'in_progress') {
          actions.push(
            <Popconfirm
              key="complete"
              title="确定要标记这个申请为已完成吗？"
              onConfirm={() => handleComplete(record.id!)}
              okText="确定"
              cancelText="取消"
            >
              <Button icon={<CheckCircleOutlined />} type="link" style={{ color: '#52c41a' }}>
                完成处理
              </Button>
            </Popconfirm>,
          );
        }

        return <Space size="middle">{actions}</Space>;
      },
    },
  ];

  // 库存操作记录表格列配置
  const operationColumns = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 80,
    },
    {
      title: '食材',
      dataIndex: 'ingredient_name',
      key: 'ingredient_name',
    },
    {
      title: '操作类型',
      dataIndex: 'operation_type',
      key: 'operation_type',
      render: (type: string) => (
        <Tag color={type === 'in' ? 'green' : 'red'}>{type === 'in' ? '入库' : '出库'}</Tag>
      ),
    },
    {
      title: '数量',
      dataIndex: 'quantity',
      key: 'quantity',
    },
    {
      title: '操作员',
      dataIndex: 'operator_name',
      key: 'operator_name',
    },
    {
      title: '操作时间',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (text: string) => (text ? dayjs(text).format('YYYY-MM-DD HH:mm:ss') : '-'),
    },
    {
      title: '备注',
      dataIndex: 'notes',
      key: 'notes',
      ellipsis: true,
    },
    {
      title: '操作',
      key: 'action',
      render: (_: unknown, record: InventoryOperation) => (
        <Space size="middle">
          <Button
            key="edit"
            icon={<EditOutlined />}
            onClick={() => handleEditOperation(record)}
            type="link"
          >
            编辑
          </Button>
          <Popconfirm
            key="delete"
            title="确定要删除这条记录吗？"
            onConfirm={() => handleDeleteOperation(record.id!)}
            okText="确定"
            cancelText="取消"
          >
            <Button icon={<DeleteOutlined />} type="link" danger>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  // 新增库存操作
  const showAddOperationModal = () => {
    setOperationModalTitle('新增出入库操作');
    setSelectedOperationId(null);
    operationForm.resetFields();
    operationForm.setFieldsValue({
      operation_type: 'in',
      quantity: 1,
      // 设置操作员为当前用户
      operator: currentUser?.id,
      inspector: null,
      notes: '',
    });
    setOperationModalVisible(true);
  };

  // 编辑库存操作
  const handleEditOperation = (record: InventoryOperation) => {
    setOperationModalTitle('编辑出入库操作');
    setSelectedOperationId(record.id!);

    // 格式化日期数据
    const formattedRecord = {
      ...record,
      production_date: record.production_date ? dayjs(record.production_date) : undefined,
    };

    operationForm.setFieldsValue(formattedRecord);
    setOperationModalVisible(true);
  };

  // 删除库存操作
  const handleDeleteOperation = async (id: number) => {
    try {
      await deleteInventoryOperation.mutateAsync(id);
    } catch (error) {
      console.error('删除操作失败', error);
    }
  };

  // 关闭库存操作模态框
  const closeOperationModal = () => {
    setOperationModalVisible(false);
    setSelectedOperationId(null);
    operationForm.resetFields();
  };

  // 提交库存操作表单
  const handleOperationSubmit = async () => {
    try {
      const values = await operationForm.validateFields();

      // 格式化表单数据
      const formData = {
        ...values,
        production_date:
          values.production_date && dayjs(values.production_date).format('YYYY-MM-DD'),
        notes: values.notes
          ? `${values.notes}${values.notes.endsWith('。') ? '' : '。'} 来源:管理员界面，设备:${navigator.userAgent.includes('Mobile') ? '移动端' : '电脑端'}，IP:${window.location.hostname}`
          : `来源:管理员界面，设备:${navigator.userAgent.includes('Mobile') ? '移动端' : '电脑端'}，IP:${window.location.hostname}`,
      };

      if (selectedOperationId) {
        // 更新操作
        await updateInventoryOperation.mutateAsync({
          id: selectedOperationId,
          data: formData,
        });
      } else {
        // 新增操作
        const result = await createInventoryOperation.mutateAsync(formData);

        // 记录到控制台，方便追踪
        console.log(
          `新增库存操作记录: ID=${result.id}, 食材ID=${formData.ingredient}, 数量=${formData.quantity}, 类型=${formData.operation_type}`,
        );
      }

      closeOperationModal();
    } catch (error) {
      console.error('表单提交失败', error);
    }
  };

  return (
    <div className="stock-page">
      <Title level={2}>出入库管理</Title>

      <Tabs activeKey={activeTab} onChange={handleTabChange}>
        <TabPane tab="出库申请" key="requests">
          <Card
            title="出库申请列表"
            extra={
              <Button type="primary" icon={<PlusOutlined />} onClick={showAddRequestModal}>
                新建申请
              </Button>
            }
          >
            <Table
              columns={requestColumns}
              dataSource={materialRequests}
              rowKey="id"
              loading={isLoadingRequests}
              pagination={{ pageSize: 10 }}
            />
          </Card>
        </TabPane>

        <TabPane tab="库存操作记录" key="operations">
          <Card
            title="出入库操作记录"
            extra={
              <Button type="primary" icon={<PlusOutlined />} onClick={showAddOperationModal}>
                新增操作
              </Button>
            }
          >
            <Table
              columns={operationColumns}
              dataSource={inventoryOperations}
              rowKey="id"
              loading={isLoadingOperations}
              pagination={{ pageSize: 10 }}
            />
          </Card>
        </TabPane>
      </Tabs>

      {/* 出库申请详情抽屉 */}
      <Drawer
        title="出库申请详情"
        placement="right"
        onClose={closeDrawer}
        open={drawerVisible}
        width={600}
      >
        {isLoadingRequestDetail ? (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>加载中...</div>
        ) : selectedRequest ? (
          <>
            <Descriptions title="基本信息" bordered column={1}>
              <Descriptions.Item label="申请编号">{selectedRequest.id}</Descriptions.Item>
              <Descriptions.Item label="标题">{selectedRequest.title}</Descriptions.Item>
              <Descriptions.Item label="描述">
                {selectedRequest.description || '无'}
              </Descriptions.Item>
              <Descriptions.Item label="状态">
                {getStatusTag(selectedRequest.status)}
              </Descriptions.Item>
              <Descriptions.Item label="申请人">
                {selectedRequest.requested_by_name}
              </Descriptions.Item>
              <Descriptions.Item label="申请时间">
                {selectedRequest.requested_at &&
                  dayjs(selectedRequest.requested_at).format('YYYY-MM-DD HH:mm:ss')}
              </Descriptions.Item>

              {selectedRequest.approved_by && (
                <>
                  <Descriptions.Item label="审批人">
                    {selectedRequest.approved_by_name}
                  </Descriptions.Item>
                  <Descriptions.Item label="审批时间">
                    {selectedRequest.approved_at &&
                      dayjs(selectedRequest.approved_at).format('YYYY-MM-DD HH:mm:ss')}
                  </Descriptions.Item>
                </>
              )}

              {selectedRequest.assigned_to && (
                <>
                  <Descriptions.Item label="指派处理员工">
                    {selectedRequest.assigned_to_name}
                  </Descriptions.Item>
                  <Descriptions.Item label="指派时间">
                    {selectedRequest.assigned_at &&
                      dayjs(selectedRequest.assigned_at).format('YYYY-MM-DD HH:mm:ss')}
                  </Descriptions.Item>
                </>
              )}

              {selectedRequest.completed_by && (
                <>
                  <Descriptions.Item label="完成人">
                    {selectedRequest.completed_by_name}
                  </Descriptions.Item>
                  <Descriptions.Item label="完成时间">
                    {selectedRequest.completed_at &&
                      dayjs(selectedRequest.completed_at).format('YYYY-MM-DD HH:mm:ss')}
                  </Descriptions.Item>
                </>
              )}
            </Descriptions>

            <Divider orientation="left">申请食材列表</Divider>

            <List
              bordered
              dataSource={selectedRequest.items}
              renderItem={(item: MaterialRequestItem) => (
                <List.Item>
                  <List.Item.Meta
                    title={`${item.ingredient_name} - ${item.quantity} ${item.unit}`}
                    description={item.notes || '无备注'}
                  />
                </List.Item>
              )}
            />

            <div style={{ marginTop: 20, textAlign: 'right' }}>
              {selectedRequest.status === 'pending' && (
                <Space>
                  <Button
                    type="primary"
                    onClick={() => {
                      closeDrawer();
                      handleApprove(selectedRequest.id!);
                    }}
                  >
                    批准
                  </Button>
                  <Button
                    danger
                    onClick={() => {
                      closeDrawer();
                      handleReject(selectedRequest.id!);
                    }}
                  >
                    拒绝
                  </Button>
                </Space>
              )}

              {selectedRequest.status === 'approved' && !selectedRequest.assigned_to && (
                <Button
                  type="primary"
                  onClick={() => {
                    closeDrawer();
                    showAssignModal(selectedRequest.id!);
                  }}
                >
                  指派员工
                </Button>
              )}

              {selectedRequest.status === 'approved' && selectedRequest.assigned_to && (
                <Button
                  type="primary"
                  onClick={() => {
                    closeDrawer();
                    handleStartProcessing(selectedRequest.id!);
                  }}
                >
                  开始处理
                </Button>
              )}

              {selectedRequest.status === 'in_progress' && (
                <Button
                  type="primary"
                  onClick={() => {
                    closeDrawer();
                    handleComplete(selectedRequest.id!);
                  }}
                >
                  完成处理
                </Button>
              )}
            </div>
          </>
        ) : (
          <Empty description="未找到申请信息" />
        )}
      </Drawer>

      {/* 指派员工模态框 */}
      <Modal
        title="指派员工处理"
        open={assignModalVisible}
        onOk={handleAssignEmployee}
        onCancel={closeAssignModal}
        confirmLoading={assignEmployeeMutation.isPending}
      >
        <Form form={assignForm} layout="vertical">
          <Form.Item
            name="employeeId"
            label="选择处理员工"
            rules={[{ required: true, message: '请选择一名员工' }]}
          >
            <Select
              placeholder="请选择员工"
              loading={isLoadingEmployees}
              onChange={value => setSelectedEmployeeId(value)}
            >
              {employees
                .filter(employee => employee.is_active)
                .map(employee => (
                  <Option key={employee.id} value={employee.id}>
                    {employee.username}
                  </Option>
                ))}
            </Select>
          </Form.Item>
        </Form>
      </Modal>

      {/* 出库申请模态框 */}
      <Modal
        title={requestModalTitle}
        open={requestModalVisible}
        onOk={handleRequestSubmit}
        onCancel={closeRequestModal}
        width={700}
        confirmLoading={createMaterialRequest.isPending || updateMaterialRequest.isPending}
      >
        <Form form={requestForm} layout="vertical">
          <Form.Item
            name="title"
            label="申请标题"
            rules={[{ required: true, message: '请输入申请标题' }]}
          >
            <Input placeholder="请输入申请标题" />
          </Form.Item>

          <Form.Item name="description" label="申请描述">
            <TextArea rows={3} placeholder="请输入申请描述（可选）" />
          </Form.Item>

          <Divider orientation="left">申请食材</Divider>

          {requestItems.map((item, index) => (
            <div
              key={item.id}
              style={{ display: 'flex', marginBottom: 16, alignItems: 'flex-start' }}
            >
              <div style={{ flex: 1, marginRight: 8 }}>
                <Form.Item label={index === 0 ? '食材' : ''} required style={{ marginBottom: 0 }}>
                  <Select
                    placeholder="选择食材"
                    loading={isLoadingIngredients}
                    value={item.ingredient}
                    onChange={value => updateRequestItem(item.id, 'ingredient', value)}
                    style={{ width: '100%' }}
                    showSearch
                    optionFilterProp="children"
                  >
                    {ingredients.map((ingredient: Ingredient) => (
                      <Option key={ingredient.id} value={ingredient.id}>
                        {ingredient.name} ({ingredient.quantity} {ingredient.unit})
                      </Option>
                    ))}
                  </Select>
                </Form.Item>
              </div>

              <div style={{ width: 100, marginRight: 8 }}>
                <Form.Item label={index === 0 ? '数量' : ''} required style={{ marginBottom: 0 }}>
                  <Input
                    type="number"
                    min={0.01}
                    step={0.01}
                    value={item.quantity}
                    onChange={e =>
                      updateRequestItem(item.id, 'quantity', parseFloat(e.target.value) || 0)
                    }
                  />
                </Form.Item>
              </div>

              <div style={{ flex: 1, marginRight: 8 }}>
                <Form.Item label={index === 0 ? '备注' : ''} style={{ marginBottom: 0 }}>
                  <Input
                    placeholder="备注（可选）"
                    value={item.notes}
                    onChange={e => updateRequestItem(item.id, 'notes', e.target.value)}
                  />
                </Form.Item>
              </div>

              <Button
                type="link"
                danger
                icon={<DeleteOutlined />}
                onClick={() => removeRequestItem(item.id)}
                style={{ marginTop: index === 0 ? 29 : 0 }}
                disabled={requestItems.length <= 1}
              />
            </div>
          ))}

          <Button
            type="dashed"
            onClick={addRequestItem}
            block
            icon={<PlusOutlined />}
            style={{ marginTop: 16 }}
          >
            添加食材
          </Button>
        </Form>
      </Modal>

      {/* 库存操作模态框 */}
      <Modal
        title={operationModalTitle}
        open={operationModalVisible}
        onOk={handleOperationSubmit}
        onCancel={closeOperationModal}
        confirmLoading={createInventoryOperation.isPending || updateInventoryOperation.isPending}
      >
        <Form form={operationForm} layout="vertical">
          <Form.Item
            name="ingredient"
            label="选择食材"
            rules={[{ required: true, message: '请选择食材' }]}
          >
            <Select
              placeholder="请选择食材"
              loading={isLoadingIngredients}
              showSearch
              optionFilterProp="children"
            >
              {ingredients.map((ingredient: Ingredient) => (
                <Option key={ingredient.id} value={ingredient.id}>
                  {ingredient.name} ({ingredient.quantity} {ingredient.unit})
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="operation_type"
            label="操作类型"
            rules={[{ required: true, message: '请选择操作类型' }]}
          >
            <Select placeholder="请选择操作类型">
              <Option value="in">入库</Option>
              <Option value="out">出库</Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="quantity"
            label="数量"
            rules={[
              { required: true, message: '请输入数量' },
              { type: 'number', min: 0.01, message: '数量必须大于0' },
            ]}
          >
            <Input type="number" min={0.01} step={0.01} />
          </Form.Item>

          <Form.Item name="production_date" label="生产日期">
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item name="expiry_period" label="保质期（天数）">
            <Input type="number" min={1} />
          </Form.Item>

          <Form.Item name="notes" label="备注">
            <TextArea rows={4} />
          </Form.Item>

          <Form.Item
            name="operator"
            label="操作人"
            rules={[{ required: true, message: '请选择操作人' }]}
          >
            <Select placeholder="请选择操作人" loading={isLoadingEmployees}>
              {employees
                .filter(employee => employee.is_active)
                .map(employee => (
                  <Option key={employee.id} value={employee.id}>
                    {employee.username}
                  </Option>
                ))}
            </Select>
          </Form.Item>

          <Form.Item name="inspector" label="检查人">
            <Select placeholder="请选择检查人" allowClear loading={isLoadingEmployees}>
              {employees
                .filter(employee => employee.is_active)
                .map(employee => (
                  <Option key={employee.id} value={employee.id}>
                    {employee.username}
                  </Option>
                ))}
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default Stock;
