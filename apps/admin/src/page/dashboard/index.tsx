import { Button, Card, Col, Form, Input, message, Row, Spin, Statistic } from 'antd';
import { useEffect, useState } from 'react';
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

const Dashboard = () => {
  const [timeRange, setTimeRange] = useState<'day' | 'week' | 'month'>('day');
  const { data: user, isLoading: userLoading } = useCurrentUser();
  const { data: latestSensorData, isLoading: sensorLoading } = useLatestSensorData();
  const { data: sensorChartData, isLoading: chartLoading } = useSensorChartData(
    timeRange === 'day' ? { hours: 24 } : timeRange === 'week' ? { days: 7 } : { days: 30 },
  );

  // WebSocket和温度阈值状态
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [thresholdUpdating, setThresholdUpdating] = useState(false);
  const [threshold, setThreshold] = useState<number | null>(null);
  const [wsConnected, setWsConnected] = useState(false);
  const [form] = Form.useForm();

  // 初始化WebSocket连接
  useEffect(() => {
    // 创建WebSocket连接
    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const socketUrl = `${wsProtocol}//${window.location.hostname}:8380/env`;

    const ws = new WebSocket(socketUrl);

    ws.onopen = () => {
      console.log('WebSocket连接已建立');
      setWsConnected(true);
    };

    ws.onmessage = event => {
      try {
        const data = JSON.parse(event.data);
        console.log('收到WebSocket消息:', data);

        // 处理不同类型的消息
        if (data.type === 'emit') {
          // 更新传感器数据
          if (data.threshold !== undefined) {
            setThreshold(data.threshold);
          }
        } else if (data.type === 'response' && data.status === 'success') {
          // 处理阈值更新响应
          if (data.message && data.message.includes('温度阈值')) {
            message.success(`温度阈值已成功更新为: ${data.newThreshold}°C`);
            setThreshold(data.newThreshold);
            setThresholdUpdating(false);
          }
        }
      } catch (error) {
        console.error('解析WebSocket消息失败:', error);
      }
    };

    ws.onclose = () => {
      console.log('WebSocket连接已关闭');
      setWsConnected(false);
    };

    ws.onerror = error => {
      console.error('WebSocket错误:', error);
      message.error('WebSocket连接错误，无法获取实时数据');
      setWsConnected(false);
    };

    setSocket(ws);

    // 组件卸载时关闭连接
    return () => {
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
    };
  }, []);

  // 更新表单中的阈值
  useEffect(() => {
    if (threshold !== null) {
      form.setFieldsValue({ threshold: threshold.toString() });
    }
  }, [threshold, form]);

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

  // 处理阈值调整
  const handleThresholdUpdate = (values: { threshold: string }) => {
    if (!socket || socket.readyState !== WebSocket.OPEN) {
      message.error('WebSocket连接未建立，无法发送命令');
      return;
    }

    const thresholdValue = parseFloat(values.threshold);

    // 验证输入
    if (isNaN(thresholdValue) || thresholdValue < 0 || thresholdValue > 100) {
      message.error('请输入0-100之间的有效温度阈值');
      return;
    }

    try {
      // 发送命令
      const command = {
        type: 'command',
        setThreshold: thresholdValue,
      };

      console.log('发送阈值设置命令:', command);
      socket.send(JSON.stringify(command));

      // 立即显示成功消息并更新状态，不等待响应
      message.success(`温度阈值已设置为: ${thresholdValue}°C`);
      setThreshold(thresholdValue);
      setThresholdUpdating(false);

      // 可选：短暂显示加载状态，增强用户体验
      setThresholdUpdating(true);
      setTimeout(() => {
        setThresholdUpdating(false);
      }, 500);
    } catch (error) {
      console.error('发送阈值设置命令失败:', error);
      message.error('发送命令失败: ' + (error instanceof Error ? error.message : '未知错误'));
      setThresholdUpdating(false);
    }
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
        <Col span={12}>
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
        <Col span={12}>
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
      </Row>

      {/* 独立的温度阈值设置卡片 */}
      <Row gutter={16} style={{ marginTop: 16 }}>
        <Col span={24}>
          <Card>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <Statistic
                  title={
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                      温度警报阈值
                      <div
                        style={{
                          width: 10,
                          height: 10,
                          borderRadius: '50%',
                          backgroundColor: wsConnected ? '#52c41a' : '#ff4d4f',
                          marginLeft: 8,
                        }}
                      />
                    </div>
                  }
                  value={threshold ?? '未知'}
                  suffix="°C"
                  precision={1}
                />
              </div>
              <Form
                form={form}
                onFinish={handleThresholdUpdate}
                layout="inline"
                style={{ marginRight: 24 }}
              >
                <Form.Item
                  name="threshold"
                  rules={[{ required: true, message: '请输入温度阈值' }]}
                  style={{ marginBottom: 0 }}
                >
                  <Input
                    placeholder="输入阈值 (0-100)"
                    suffix="°C"
                    disabled={thresholdUpdating || !wsConnected}
                    style={{ width: 150 }}
                  />
                </Form.Item>
                <Form.Item style={{ marginBottom: 0 }}>
                  <Button
                    type="primary"
                    htmlType="submit"
                    loading={thresholdUpdating}
                    disabled={!wsConnected}
                  >
                    设置
                  </Button>
                </Form.Item>
              </Form>
            </div>
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
