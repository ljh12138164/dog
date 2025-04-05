import React, { useState } from 'react';
import { Card, Button, Table, Tag, Modal, Form, Input, Select, Dropdown, Menu, Space } from 'antd';
import { useNavigate } from 'react-router-dom';
import {
  useFeedbacks,
  useCreateFeedback,
  useDeleteFeedback,
  useUpdateFeedback,
  useUpdateFeedbackStatus,
  Feedback,
  CreateFeedbackRequest,
  UpdateFeedbackStatusRequest,
} from '../../api/useFeekback';
import {
  ExclamationCircleOutlined,
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  DownOutlined,
  CheckOutlined,
  ClockCircleOutlined,
  EyeOutlined,
} from '@ant-design/icons';

const { TextArea } = Input;
const { confirm } = Modal;
const { Option } = Select;

const FeedbackStatusTag = ({ status }: { status: string }) => {
  let color = 'default';
  let text = '未知';

  switch (status) {
    case 'pending':
      color = 'blue';
      text = '待处理';
      break;
    case 'processing':
      color = 'orange';
      text = '处理中';
      break;
    case 'resolved':
      color = 'green';
      text = '已解决';
      break;
  }

  return <Tag color={color}>{text}</Tag>;
};

const Index = () => {
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [statusForm] = Form.useForm();
  const [modalVisible, setModalVisible] = useState(false);
  const [statusModalVisible, setStatusModalVisible] = useState(false);
  const [editingFeedback, setEditingFeedback] = useState<Feedback | null>(null);
  const [processingFeedback, setProcessingFeedback] = useState<Feedback | null>(null);

  const { data: feedbacks, isLoading, refetch } = useFeedbacks();
  const createFeedback = useCreateFeedback();
  const updateFeedback = useUpdateFeedback();
  const deleteFeedback = useDeleteFeedback();
  const updateFeedbackStatus = useUpdateFeedbackStatus();

  const handleAddOrEdit = () => {
    form.validateFields().then(values => {
      const formData: CreateFeedbackRequest = {
        title: values.title,
        description: values.description,
      };

      if (editingFeedback) {
        updateFeedback.mutate(
          {
            id: editingFeedback.id,
            data: formData,
          },
          {
            onSuccess: () => {
              setModalVisible(false);
              form.resetFields();
              setEditingFeedback(null);
              refetch();
            },
          },
        );
      } else {
        createFeedback.mutate(formData, {
          onSuccess: () => {
            setModalVisible(false);
            form.resetFields();
            refetch();
          },
        });
      }
    });
  };

  const handleStatusChange = () => {
    statusForm.validateFields().then(values => {
      if (!processingFeedback) return;

      const formData: UpdateFeedbackStatusRequest = {
        status: values.status,
        resolution_notes: values.resolution_notes,
      };

      updateFeedbackStatus.mutate(
        {
          id: processingFeedback.id,
          data: formData,
        },
        {
          onSuccess: () => {
            setStatusModalVisible(false);
            statusForm.resetFields();
            setProcessingFeedback(null);
            refetch();
          },
        },
      );
    });
  };

  const handleEdit = (record: Feedback) => {
    setEditingFeedback(record);
    form.setFieldsValue({
      title: record.title,
      description: record.description,
    });
    setModalVisible(true);
  };

  const handleDelete = (id: number) => {
    confirm({
      title: '确认删除',
      icon: <ExclamationCircleOutlined />,
      content: '确定要删除这条反馈吗？',
      onOk() {
        deleteFeedback.mutate(id, {
          onSuccess: () => {
            refetch();
          },
        });
      },
    });
  };

  const handleProcessFeedback = (record: Feedback, status: 'processing' | 'resolved') => {
    setProcessingFeedback(record);
    statusForm.setFieldsValue({
      status,
    });
    setStatusModalVisible(true);
  };

  const handleViewDetail = (id: number) => {
    navigate(`/feedback/${id}`);
  };

  const columns = [
    {
      title: '标题',
      dataIndex: 'title',
      key: 'title',
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => <FeedbackStatusTag status={status} />,
    },
    {
      title: '提交时间',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (date: string) => new Date(date).toLocaleString('zh-CN'),
    },
    {
      title: '更新时间',
      dataIndex: 'updated_at',
      key: 'updated_at',
      render: (date: string) => new Date(date).toLocaleString('zh-CN'),
    },
    {
      title: '操作',
      key: 'action',
      render: (_: any, record: Feedback) => (
        <Space>
          <Button type="link" icon={<EyeOutlined />} onClick={() => handleViewDetail(record.id)}>
            查看详情
          </Button>
          {record.status === 'pending' && (
            <>
              <Button type="link" icon={<EditOutlined />} onClick={() => handleEdit(record)}>
                编辑
              </Button>
              <Button
                type="link"
                danger
                icon={<DeleteOutlined />}
                onClick={() => handleDelete(record.id)}
              >
                删除
              </Button>
              <Dropdown
                overlay={
                  <Menu>
                    <Menu.Item
                      key="processing"
                      icon={<ClockCircleOutlined />}
                      onClick={() => handleProcessFeedback(record, 'processing')}
                    >
                      标记为处理中
                    </Menu.Item>
                    <Menu.Item
                      key="resolved"
                      icon={<CheckOutlined />}
                      onClick={() => handleProcessFeedback(record, 'resolved')}
                    >
                      标记为已解决
                    </Menu.Item>
                  </Menu>
                }
                trigger={['click']}
              >
                <Button type="link">
                  状态修改 <DownOutlined />
                </Button>
              </Dropdown>
            </>
          )}
          {record.status === 'processing' && (
            <Button
              type="link"
              icon={<CheckOutlined />}
              onClick={() => handleProcessFeedback(record, 'resolved')}
            >
              标记为已解决
            </Button>
          )}
          {record.status === 'resolved' && '无法操作'}
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Card
        title="我的反馈"
        extra={
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => {
              setEditingFeedback(null);
              form.resetFields();
              setModalVisible(true);
            }}
          >
            新建反馈
          </Button>
        }
      >
        <Table
          columns={columns}
          dataSource={feedbacks}
          rowKey="id"
          loading={isLoading}
          expandable={{
            expandedRowRender: record => (
              <div>
                <p style={{ margin: 0 }}>
                  <strong>详细描述：</strong>
                </p>
                <p style={{ margin: 0 }}>{record.description}</p>
                {record.resolved_at && (
                  <p style={{ margin: 0 }}>
                    <strong>解决时间：</strong>{' '}
                    {new Date(record.resolved_at).toLocaleString('zh-CN')}
                  </p>
                )}
              </div>
            ),
          }}
        />
      </Card>

      <Modal
        title={editingFeedback ? '编辑反馈' : '新建反馈'}
        open={modalVisible}
        onOk={handleAddOrEdit}
        onCancel={() => setModalVisible(false)}
        confirmLoading={createFeedback.isPending || updateFeedback.isPending}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="title"
            label="标题"
            rules={[{ required: true, message: '请输入反馈标题' }]}
          >
            <Input placeholder="请输入反馈标题" maxLength={200} />
          </Form.Item>
          <Form.Item
            name="description"
            label="详细描述"
            rules={[{ required: true, message: '请输入详细描述' }]}
          >
            <TextArea placeholder="请输入详细描述" autoSize={{ minRows: 4, maxRows: 8 }} />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="修改反馈状态"
        open={statusModalVisible}
        onOk={handleStatusChange}
        onCancel={() => setStatusModalVisible(false)}
        confirmLoading={updateFeedbackStatus.isPending}
      >
        <Form form={statusForm} layout="vertical">
          <Form.Item name="status" label="状态" rules={[{ required: true, message: '请选择状态' }]}>
            <Select placeholder="请选择状态">
              <Option value="processing">处理中</Option>
              <Option value="resolved">已解决</Option>
            </Select>
          </Form.Item>
          <Form.Item
            name="resolution_notes"
            label="处理说明"
            rules={[
              {
                required: statusForm.getFieldValue('status') === 'resolved',
                message: '已解决状态必须提供处理说明',
              },
            ]}
          >
            <TextArea
              placeholder="请输入处理过程或解决方案的说明"
              autoSize={{ minRows: 3, maxRows: 6 }}
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default Index;
