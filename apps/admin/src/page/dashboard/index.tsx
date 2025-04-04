import { Card, Col, Row, Statistic } from 'antd';
import { useCurrentUser } from '../../api/useAuth';

const Dashboard = () => {
  const { data: user, isLoading } = useCurrentUser();

  if (isLoading) {
    return <div>加载中...</div>;
  }

  return (
    <div>
      <h1>欢迎回来，{user?.username}</h1>

      <Row gutter={16} style={{ marginTop: 24 }}>
        <Col span={6}>
          <Card>
            <Statistic title="用户总数" value={132} />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic title="今日新增" value={12} />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic title="本月订单" value={325} />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic title="商品库存" value={1543} />
          </Card>
        </Col>
      </Row>

      <Row gutter={16} style={{ marginTop: 16 }}>
        <Col span={12}>
          <Card title="身份信息">
            <p>用户名: {user?.username}</p>
            <p>邮箱: {user?.email}</p>
            {/* <p>角色: {user?.roles.join(', ')}</p> */}
          </Card>
        </Col>
        <Col span={12}>
          <Card title="系统信息">
            <p>版本: v1.0.0</p>
            <p>更新时间: 2023-04-01</p>
            <p>服务状态: 正常</p>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default Dashboard;
