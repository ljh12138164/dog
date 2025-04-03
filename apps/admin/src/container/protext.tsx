import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCurrentUser } from '../api/useAuth';

interface ProtextProps {
  children: React.ReactNode;
}

/**
 * 路由保护组件
 * 如果用户未登录或不是管理员，则重定向到登录页
 */
const Protext = ({ children }: ProtextProps) => {
  const navigate = useNavigate();
  const { data: user, isLoading, isError } = useCurrentUser();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    // 检查本地存储中是否有token
    const token = localStorage.getItem('token');

    // 如果没有token，则重定向到登录页
    if (!token) {
      navigate('/login');
      return;
    }

    // 当用户数据加载完成且没有错误时，检查是否是管理员
    if (!isLoading) {
      setIsChecking(false);
      if (user) {
        const isAdmin = user.user_type === 'admin';
        if (!isAdmin) {
          // 如果不是管理员，清除登录信息并重定向到登录页
          localStorage.removeItem('token');
          localStorage.removeItem('refresh_token');
          localStorage.removeItem('user');
          navigate('/login');
        }
      } else if (isError) {
        console.error('获取用户信息失败，重定向到登录页');
        localStorage.removeItem('token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('user');
        navigate('/login');
      }
    }
  }, [navigate, user, isLoading, isError]);

  // 如果正在检查或加载，显示加载状态
  if (isChecking || isLoading) {
    return (
      <div
        style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}
      >
        <div>正在验证身份...</div>
      </div>
    );
  }

  // 如果没有用户数据，显示空白
  if (!user) {
    return null;
  }

  // 已登录且是管理员，渲染子组件
  return <>{children}</>;
};

export default Protext;
