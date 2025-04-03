import { Button, Card, Form, Input, Typography } from 'antd';
import { useCurrentUser, useLogin } from '../api/useAuth';
import { useForm, Controller } from 'react-hook-form';
import { LoginRequest } from '../api/useAuth';
import { Navigate } from 'react-router';
const { Title } = Typography;

const Login = () => {
  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginRequest>({
    defaultValues: {
      phone: '',
      password: '',
    },
  });

  const login = useLogin();
  const { data: user, isLoading } = useCurrentUser();

  const onSubmit = (data: LoginRequest) => {
    login.mutate(data);
  };
  if (isLoading) {
    return <div>加载中...</div>;
  }
  if (user?.user_type === 'admin') {
    return <Navigate to="/dashboard" />;
  }
  if (
    user?.user_type === 'inventory' ||
    user?.user_type === 'procurement' ||
    user?.user_type === 'employee' ||
    user?.user_type === 'logistics'
  ) {
    localStorage.removeItem('token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');
    return <Navigate to="/login" />;
  }

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        background: '#f0f2f5',
      }}
    >
      <Card style={{ width: 400 }}>
        <Title level={2} style={{ textAlign: 'center', marginBottom: 24 }}>
          仓库管理系统
        </Title>
        <Form onFinish={handleSubmit(onSubmit)} layout="vertical">
          <Form.Item
            label="用户名"
            validateStatus={errors.phone ? 'error' : ''}
            help={errors.phone?.message}
          >
            <Controller
              name="phone"
              control={control}
              rules={{ required: '请输入用户名' }}
              render={({ field }) => <Input {...field} placeholder="请输入用户名" />}
            />
          </Form.Item>

          <Form.Item
            label="密码"
            validateStatus={errors.password ? 'error' : ''}
            help={errors.password?.message}
          >
            <Controller
              name="password"
              control={control}
              rules={{ required: '请输入密码' }}
              render={({ field }) => <Input.Password {...field} placeholder="请输入密码" />}
            />
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit" block loading={login.isPending}>
              登录
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
};

export default Login;
