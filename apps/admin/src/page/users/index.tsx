import { Button, Form, Input, Modal, Select, Space, Table, Tag, message } from 'antd';
import { useState } from 'react';
import apiClient, { User, useUsers } from '../../api/useAuth';
import {
  CreateUserRequest,
  UpdateUserRequest,
  useCreateUser,
  useUpdateUser,
} from '../../api/useUser';

const { Option } = Select;

const Users = () => {
  const { data: users, isLoading, isError, error, refetch } = useUsers();
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [form] = Form.useForm();
  const [editForm] = Form.useForm();
  const createUser = useCreateUser();
  const updateUser = useUpdateUser();

  // 处理API请求可能出现的错误
  if (isError) {
    console.error('获取用户列表失败:', error);
  }

  const handleDelete = async (id: number) => {
    Modal.confirm({
      title: '确认删除',
      content: '确定要删除此用户吗？此操作不可逆。',
      onOk: async () => {
        try {
          setDeleteLoading(true);
          await apiClient.delete(`/users/${id}/`);
          message.success('删除成功');
          refetch();
        } catch (error) {
          message.error('删除失败');
        } finally {
          setDeleteLoading(false);
        }
      },
    });
  };

  // 处理创建用户
  const handleCreateUser = async (values: CreateUserRequest) => {
    try {
      await createUser.mutateAsync(values);
      setCreateModalVisible(false);
      form.resetFields();
    } catch (error) {
      // 错误处理在useCreateUser中已实现
    }
  };

  // 打开编辑用户弹窗
  const handleEditUser = (user: User) => {
    setCurrentUser(user);
    editForm.setFieldsValue({
      username: user.username,
      email: user.email,
      phone: user.phone,
      user_type: user.user_type,
    });
    setEditModalVisible(true);
  };

  // 处理更新用户
  const handleUpdateUser = async (values: UpdateUserRequest) => {
    if (!currentUser) return;

    try {
      await updateUser.mutateAsync({
        userId: currentUser.id,
        data: values,
      });
      setEditModalVisible(false);
      editForm.resetFields();
      setCurrentUser(null);
    } catch (error) {
      // 错误处理在useUpdateUser中已实现
    }
  };

  const columns = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
    },
    {
      title: '用户名',
      dataIndex: 'username',
      key: 'username',
    },
    {
      title: '邮箱',
      dataIndex: 'email',
      key: 'email',
    },
    {
      title: '手机号',
      dataIndex: 'phone',
      key: 'phone',
    },
    {
      title: '用户类型',
      dataIndex: 'user_type',
      key: 'user_type',
      render: (type: string) => {
        const typeMap: Record<string, { color: string; label: string }> = {
          admin: { color: 'red', label: '系统管理员' },
          inventory: { color: 'green', label: '库存管理员' },
          procurement: { color: 'blue', label: '采购经理' },
          logistics: { color: 'orange', label: '物流管理员' },
          employee: { color: 'default', label: '普通员工' },
        };
        const { color, label } = typeMap[type] || { color: 'default', label: type };
        return <Tag color={color}>{label}</Tag>;
      },
    },
    {
      title: '状态',
      dataIndex: 'is_active',
      key: 'is_active',
      render: (active: boolean) => (
        <Tag color={active ? 'green' : 'red'}>{active ? '启用' : '禁用'}</Tag>
      ),
    },
    {
      title: '操作',
      key: 'action',
      render: (_: unknown, record: User) => (
        <Space size="middle">
          <Button type="link" onClick={() => handleEditUser(record)}>
            编辑
          </Button>
          <Button
            type="link"
            danger
            onClick={() => handleDelete(record.id)}
            loading={deleteLoading}
          >
            删除
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <h1>用户管理</h1>
        <Button type="primary" onClick={() => setCreateModalVisible(true)}>
          创建用户
        </Button>
      </div>

      {/* 将UserListResponse转换为User类型的数据 */}
      {(() => {
        // 处理数据转换
        const tableData = Array.isArray(users)
          ? users.map(user => ({
              id: user.id,
              username: user.username,
              email: user.email,
              phone: user.phone,
              avatar: user.avatar || undefined, // 将null转为undefined
              user_type: user.user_type as User['user_type'], // 类型断言
              is_active: user.is_active,
              permissions: [] as string[], // 添加空的permissions数组
            }))
          : [];

        return (
          <Table
            columns={columns}
            dataSource={tableData as User[]}
            rowKey="id"
            loading={isLoading}
            pagination={{
              total: tableData.length,
              showSizeChanger: true,
              showQuickJumper: true,
              showTotal: total => `共 ${total} 条记录`,
            }}
          />
        );
      })()}

      {/* 创建用户弹窗 */}
      <Modal
        title="创建用户"
        open={createModalVisible}
        onCancel={() => {
          setCreateModalVisible(false);
          form.resetFields();
        }}
        footer={null}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleCreateUser}
          initialValues={{ user_type: 'employee' }}
        >
          <Form.Item
            label="用户名"
            name="username"
            rules={[{ required: true, message: '请输入用户名' }]}
          >
            <Input placeholder="请输入用户名" />
          </Form.Item>
          <Form.Item
            label="邮箱"
            name="email"
            rules={[{ type: 'email', message: '请输入有效的邮箱地址' }]}
          >
            <Input placeholder="请输入邮箱（选填）" />
          </Form.Item>
          <Form.Item
            label="手机号"
            name="phone"
            rules={[
              { required: true, message: '请输入手机号' },
              { pattern: /^1[3-9]\d{9}$/, message: '请输入有效的手机号' },
            ]}
          >
            <Input placeholder="请输入手机号" />
          </Form.Item>
          <Form.Item
            label="密码"
            name="password"
            rules={[
              { required: true, message: '请输入密码' },
              { min: 6, message: '密码长度不能小于6位' },
            ]}
          >
            <Input.Password placeholder="请输入密码" />
          </Form.Item>
          <Form.Item
            label="确认密码"
            name="confirm_password"
            dependencies={['password']}
            rules={[
              { required: true, message: '请确认密码' },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue('password') === value) {
                    return Promise.resolve();
                  }
                  return Promise.reject(new Error('两次输入的密码不一致'));
                },
              }),
            ]}
          >
            <Input.Password placeholder="请再次输入密码" />
          </Form.Item>
          <Form.Item label="用户类型" name="user_type">
            <Select placeholder="请选择用户类型">
              <Option value="admin">系统管理员</Option>
              <Option value="inventory">库存管理员</Option>
              <Option value="procurement">采购经理</Option>
              <Option value="logistics">物流管理员</Option>
              <Option value="employee">普通员工</Option>
            </Select>
          </Form.Item>
          <Form.Item>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <Button onClick={() => setCreateModalVisible(false)}>取消</Button>
              <Button type="primary" htmlType="submit" loading={createUser.isPending}>
                创建
              </Button>
            </div>
          </Form.Item>
        </Form>
      </Modal>

      {/* 编辑用户弹窗 */}
      <Modal
        title="编辑用户"
        open={editModalVisible}
        onCancel={() => {
          setEditModalVisible(false);
          editForm.resetFields();
          setCurrentUser(null);
        }}
        footer={null}
      >
        <Form form={editForm} layout="vertical" onFinish={handleUpdateUser}>
          <Form.Item
            label="用户名"
            name="username"
            rules={[{ required: true, message: '请输入用户名' }]}
          >
            <Input placeholder="请输入用户名" />
          </Form.Item>
          <Form.Item
            label="邮箱"
            name="email"
            rules={[{ type: 'email', message: '请输入有效的邮箱地址' }]}
          >
            <Input placeholder="请输入邮箱（选填）" />
          </Form.Item>
          <Form.Item
            label="手机号"
            name="phone"
            rules={[
              { required: true, message: '请输入手机号' },
              { pattern: /^1[3-9]\d{9}$/, message: '请输入有效的手机号' },
            ]}
          >
            <Input placeholder="请输入手机号" />
          </Form.Item>
          <Form.Item label="用户类型" name="user_type">
            <Select placeholder="请选择用户类型">
              <Option value="admin">系统管理员</Option>
              <Option value="inventory">库存管理员</Option>
              <Option value="procurement">采购经理</Option>
              <Option value="logistics">物流管理员</Option>
              <Option value="employee">普通员工</Option>
            </Select>
          </Form.Item>
          <Form.Item label="状态" name="is_active">
            <Select placeholder="请选择状态">
              <Option value={true}>启用</Option>
              <Option value={false}>禁用</Option>
            </Select>
          </Form.Item>
          <Form.Item>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <Button onClick={() => setEditModalVisible(false)}>取消</Button>
              <Button type="primary" htmlType="submit" loading={updateUser.isPending}>
                保存
              </Button>
            </div>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default Users;
