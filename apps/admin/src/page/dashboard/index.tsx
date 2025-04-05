import { Button, Card, Col, Row, Spin, Statistic, Tabs } from 'antd';
import { useState } from 'react';
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useCurrentUser } from '../../api/useAuth';
import { useLatestSensorData, useSensorChartData } from '../../api/useSensor';

const { TabPane } = Tabs;

const Dashboard = () => {
  const [timeRange, setTimeRange] = useState<'day' | 'week' | 'month'>('day');
  const { data: user, isLoading: userLoading } = useCurrentUser();
  const { data: latestSensorData, isLoading: sensorLoading } = useLatestSensorData();
  const { data: sensorChartData, isLoading: chartLoading } = useSensorChartData(
    timeRange === 'day' ? { hours: 24 } : timeRange === 'week' ? { days: 7 } : { days: 30 },
  );

  // 获取传感器当前数值
  const getTemperature = () => {
    if (!latestSensorData) return 0;
    if (Array.isArray(latestSensorData.temperature)) {
      return latestSensorData.temperature[0] || 0;
    }
    return latestSensorData.temperature || 0;
  };

  const getHumidity = () => {
    if (!latestSensorData) return 0;
    if (Array.isArray(latestSensorData.humidity)) {
      return latestSensorData.humidity[0] || 0;
    }
    return latestSensorData.humidity || 0;
  };

  // 处理图表数据
  const prepareChartData = () => {
    if (
      !sensorChartData ||
      !sensorChartData.timestamps ||
      sensorChartData.timestamps.length === 0
    ) {
      return [];
    }

    // 减少数据点数量，使图表更清晰
    const maxPoints = 60; // 最大数据点数量
    const step =
      sensorChartData.timestamps.length > maxPoints
        ? Math.floor(sensorChartData.timestamps.length / maxPoints)
        : 1;

    const result = [];
    for (let i = 0; i < sensorChartData.timestamps.length; i += step) {
      const timestamp = sensorChartData.timestamps[i];
      const date = new Date(timestamp);
      let formattedTime;

      if (timeRange === 'day') {
        formattedTime = `${date.getHours()}:${date.getMinutes().toString().padStart(2, '0')}`;
      } else {
        formattedTime = `${date.getMonth() + 1}/${date.getDate()}`;
      }

      result.push({
        time: formattedTime,
        温度: sensorChartData.temperature[i] ?? 0,
        湿度: sensorChartData.humidity[i] ?? 0,
      });
    }

    return result;
  };

  const chartData = prepareChartData();

  if (userLoading) {
    return <div>加载中...</div>;
  }

  return (
    <div>
      <h1>欢迎回来，{user?.username}</h1>

      <Row gutter={16} style={{ marginTop: 24 }}>
        <Col span={8}>
          <Card>
            <Statistic
              title="当前温度"
              value={getTemperature()}
              suffix="°C"
              loading={sensorLoading}
              precision={1}
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card>
            <Statistic
              title="当前湿度"
              value={getHumidity()}
              suffix="%"
              loading={sensorLoading}
              precision={1}
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card>
            <Statistic title="用户总数" value={132} />
          </Card>
        </Col>
      </Row>

      <Card
        title={`环境数据走势 (${timeRange === 'day' ? '近24小时' : timeRange === 'week' ? '近7天' : '近30天'})`}
        style={{ marginTop: 16 }}
      >
        <div style={{ marginBottom: 16 }}>
          <Button
            type={timeRange === 'day' ? 'primary' : 'default'}
            onClick={() => setTimeRange('day')}
            style={{ marginRight: 8 }}
          >
            日
          </Button>
          <Button
            type={timeRange === 'week' ? 'primary' : 'default'}
            onClick={() => setTimeRange('week')}
            style={{ marginRight: 8 }}
          >
            周
          </Button>
          <Button
            type={timeRange === 'month' ? 'primary' : 'default'}
            onClick={() => setTimeRange('month')}
          >
            月
          </Button>
        </div>

        <Spin spinning={chartLoading}>
          {chartData.length > 0 ? (
            <div style={{ width: '100%', height: 400 }}>
              <ResponsiveContainer>
                <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="time" tickMargin={10} height={50} interval="preserveStartEnd" />
                  <YAxis />
                  <Tooltip
                    formatter={value => [`${value}`, '']}
                    labelFormatter={label => `时间: ${label}`}
                  />
                  <Legend verticalAlign="top" height={36} />
                  <Line
                    name="温度 (°C)"
                    type="monotone"
                    dataKey="温度"
                    stroke="#2196F3"
                    strokeWidth={2}
                    dot={{ r: 2 }}
                    activeDot={{ r: 5 }}
                  />
                  <Line
                    name="湿度 (%)"
                    type="monotone"
                    dataKey="湿度"
                    stroke="#FF9800"
                    strokeWidth={2}
                    dot={{ r: 2 }}
                    activeDot={{ r: 5 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '30px 0' }}>暂无图表数据</div>
          )}
        </Spin>
      </Card>
    </div>
  );
};

export default Dashboard;
