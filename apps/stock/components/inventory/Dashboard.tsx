import { MaterialIcons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
  Dimensions,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import { ActivityIndicator, Button, Card, Paragraph, Title } from 'react-native-paper';
import Toast from 'react-native-toast-message';
import {
  SensorChartResponse,
  useLatestSensorData,
  useSensorChartData,
} from '../../api/useInventory';
import { useStockData } from '../../api/websocket';

const screenWidth = Dimensions.get('window').width;

const Dashboard = () => {
  const [timeRange, setTimeRange] = useState<'day' | 'week' | 'month'>('day');
  const [newThreshold, setNewThreshold] = useState('');

  // 获取传感器数据
  const { data: latestSensorData, isLoading: isLoadingSensor } = useLatestSensorData();
  const { data: sensorChartData, isLoading: isLoadingSensorChart } = useSensorChartData(
    timeRange === 'day' ? { hours: 24 } : timeRange === 'week' ? { days: 7 } : { days: 30 },
  );

  // 使用WebSocket数据和阈值调整功能
  const { socket, currentThreshold, thresholdUpdating, updateThreshold, data } = useStockData();

  // const { data: ingredients, isLoading: isLoadingIngredients } = useIngredientList();
  // const createEnvironmentData = useCreateEnvironmentData(Toast);
  // const createSensorData = useCreateSensorData(Toast);
  // 发送阈值调整命令
  const handleThresholdSubmit = () => {
    if (!socket || socket.readyState !== WebSocket.OPEN) {
      Toast.show({
        type: 'error',
        text1: '连接错误',
        text2: 'WebSocket连接未建立，无法发送命令',
      });
      return;
    }

    const thresholdValue = parseFloat(newThreshold);

    // 添加数值验证
    if (isNaN(thresholdValue) || thresholdValue < 0 || thresholdValue > 100) {
      Toast.show({
        type: 'error',
        text1: '输入错误',
        text2: '请输入有效的温度阈值 (0-100°C)',
      });
      return;
    }

    try {
      // 直接构造并发送WebSocket命令，确保格式正确
      const command = {
        type: 'command',
        setThreshold: thresholdValue,
      };

      socket.send(JSON.stringify(command));

      // 成功后清空输入框
      setNewThreshold('');

      Toast.show({
        type: 'success',
        text1: '设置成功',
        text2: `温度阈值调整命令已发送: ${thresholdValue}°C`,
      });
    } catch (error) {
      console.error('发送阈值设置命令失败:', error);
      Toast.show({
        type: 'error',
        text1: '发送失败',
        text2: error instanceof Error ? error.message : '无法更新阈值',
      });
    }
  };

  // 计算库存统计信息
  // const getInventoryStats = () => {
  //   if (!ingredients) return { total: 0, normal: 0, low: 0, expired: 0, pendingCheck: 0 };

  //   const stats = {
  //     total: ingredients.length,
  //     normal: ingredients.filter(i => i.status === 'normal').length,
  //     low: ingredients.filter(i => i.status === 'low').length,
  //     expired: ingredients.filter(i => i.status === 'expired').length,
  //     pendingCheck: ingredients.filter(i => i.status === 'pending_check').length,
  //   };

  //   return stats;
  // };

  // 准备图表数据
  const prepareChartData = () => {
    // 使用传感器数据替代环境数据
    const dataToUse: SensorChartResponse = sensorChartData || {
      timestamps: [],
      temperature: [],
      humidity: [],
      light: [],
    };

    if (!dataToUse.timestamps || dataToUse.timestamps.length === 0) {
      return {
        labels: [],
        datasets: [
          { data: [], color: () => '#2196F3' },
          { data: [], color: () => '#FF9800' },
        ],
      };
    }

    // 处理时间标签，确保合理的时间格式并减少标签数量
    const labels = dataToUse.timestamps.map((timestamp, index) => {
      const date = new Date(timestamp);

      // 只显示部分标签，避免X轴拥挤
      // 根据数据量自动调整显示的标签数量
      const skipFactor = Math.max(1, Math.ceil(dataToUse.timestamps.length / 8));
      if (index % skipFactor !== 0 && index !== dataToUse.timestamps.length - 1) {
        return ''; // 返回空字符串的标签不会显示
      }

      if (timeRange === 'day') {
        return `${date.getHours()}:${date.getMinutes().toString().padStart(2, '0')}`;
      } else if (timeRange === 'week') {
        return `${date.getMonth() + 1}/${date.getDate()}`;
      } else {
        return `${date.getMonth() + 1}/${date.getDate()}`;
      }
    });

    // 确保温度和湿度数据有效
    const temperaturesData = dataToUse.temperature.map(temp => (temp !== null ? temp : 0));
    const humidityData = dataToUse.humidity;

    return {
      labels,
      datasets: [
        {
          data: temperaturesData,
          color: (opacity = 1) => `rgba(33, 150, 243, ${opacity})`, // 蓝色表示温度
          strokeWidth: 2.5,
        },
        {
          data: humidityData,
          color: (opacity = 1) => `rgba(255, 152, 0, ${opacity})`, // 橙色表示湿度
          strokeWidth: 2.5,
        },
      ],
      legend: ['温度 (°C)', '湿度 (%)'],
    };
  };

  // const inventoryStats = getInventoryStats();
  const chartDataFormatted = prepareChartData();
  if (!data) return null;

  return (
    <ScrollView style={styles.container}>
      <Card style={styles.card}>
        <Card.Content style={styles.cardContent}>
          <Title style={styles.cardTitle}>当前环境数据</Title>
          {isLoadingSensor ? (
            <ActivityIndicator animating={true} color="#007aff" />
          ) : latestSensorData ? (
            <View style={styles.environmentDataContainer}>
              <View style={styles.dataItemBox}>
                <Text style={styles.dataValue}>{data.temperature}°C</Text>
                <Text style={styles.dataLabel}>温度</Text>
              </View>
              <View style={styles.dataItemBox}>
                <Text style={styles.dataValue}>{data.humidity}%</Text>
                <Text style={styles.dataLabel}>湿度</Text>
              </View>
              {data.light !== undefined && (
                <View style={styles.dataItemBox}>
                  <Text style={styles.dataValue}>{data.light}</Text>
                  <Text style={styles.dataLabel}>光照</Text>
                </View>
              )}
              <View style={styles.connectionStatus}>
                <Text style={[styles.statusText, socket ? styles.connected : styles.disconnected]}>
                  {socket ? '设备已连接' : '设备未连接'}
                </Text>
              </View>
              <View style={styles.updateTimeContainer}>
                <Text style={styles.updateTimeText}>
                  更新时间: {new Date(data?.timestamp || '').toLocaleString()}
                </Text>
              </View>

              {/* 温度阈值设置区域 */}
              <View style={styles.thresholdContainer}>
                <View style={styles.thresholdHeader}>
                  <Text style={styles.thresholdTitle}>温度警报阈值</Text>
                  <Text style={styles.thresholdValue}>
                    {data.threshold !== null ? `${data.threshold}°C` : '加载中...'}
                  </Text>
                </View>
                <View style={styles.thresholdInputContainer}>
                  <TextInput
                    style={styles.thresholdInput}
                    placeholder="输入新阈值"
                    keyboardType="numeric"
                    value={newThreshold}
                    onChangeText={setNewThreshold}
                    editable={!thresholdUpdating && !!socket}
                  />
                  <Button
                    mode="contained"
                    onPress={handleThresholdSubmit}
                    loading={thresholdUpdating}
                    disabled={!socket || thresholdUpdating}
                    style={[
                      styles.thresholdButton,
                      (!socket || thresholdUpdating) && styles.thresholdButtonDisabled,
                    ]}
                    color="#007aff"
                  >
                    设置
                  </Button>
                </View>
              </View>
            </View>
          ) : (
            <Paragraph>暂无环境数据</Paragraph>
          )}
        </Card.Content>
      </Card>

      <Card style={styles.card}>
        <Card.Content style={styles.cardContent}>
          <Title style={styles.cardTitle}>环境数据走势</Title>
          <View style={styles.chartHeader}>
            <Text style={styles.chartTitle}>
              {timeRange === 'day' ? '近24小时' : timeRange === 'week' ? '近7天' : '近30天'}环境数据
            </Text>
            <View style={styles.timeRangeSelector}>
              <TouchableOpacity
                style={[styles.timeButton, timeRange === 'day' && styles.activeTimeButton]}
                onPress={() => setTimeRange('day')}
              >
                <Text style={timeRange === 'day' ? styles.activeTimeText : styles.timeText}>
                  天
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.timeButton, timeRange === 'week' && styles.activeTimeButton]}
                onPress={() => setTimeRange('week')}
              >
                <Text style={timeRange === 'week' ? styles.activeTimeText : styles.timeText}>
                  周
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.timeButton, timeRange === 'month' && styles.activeTimeButton]}
                onPress={() => setTimeRange('month')}
              >
                <Text style={timeRange === 'month' ? styles.activeTimeText : styles.timeText}>
                  月
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.chartContainer}>
            {isLoadingSensorChart ? (
              <ActivityIndicator
                animating={true}
                style={styles.chartLoader}
                size="large"
                color="#2196F3"
              />
            ) : sensorChartData &&
              sensorChartData.timestamps &&
              sensorChartData.timestamps.length > 0 ? (
              <View style={styles.chartWrapper}>
                <LineChart
                  data={chartDataFormatted}
                  width={screenWidth - 55}
                  height={190}
                  yAxisLabel=""
                  yAxisSuffix=""
                  withInnerLines={true}
                  withOuterLines={false}
                  withHorizontalLines={true}
                  withVerticalLines={false}
                  yAxisInterval={1}
                  chartConfig={{
                    backgroundColor: '#fff',
                    backgroundGradientFrom: '#fff',
                    backgroundGradientTo: '#fff',
                    decimalPlaces: 1,
                    color: (opacity = 1) => `rgba(33, 150, 243, ${opacity})`,
                    labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                    style: {
                      borderRadius: 16,
                    },
                    propsForDots: {
                      r: '2',
                      strokeWidth: '1',
                    },
                    propsForLabels: {
                      fontSize: 8,
                      rotation: 0,
                    },
                    formatYLabel: value => value,
                    formatXLabel: value => {
                      if (!value) return '';

                      if (timeRange === 'day') {
                        return value.split(':')[0];
                      } else if (timeRange === 'week' || timeRange === 'month') {
                        const parts = value.split('/');
                        return parts.length > 1 ? parts[1] : value;
                      }
                      return value;
                    },
                  }}
                  fromZero={false}
                  segments={5}
                  style={styles.chart}
                  bezier
                />
                <View style={styles.chartLegend}>
                  <View style={styles.legendItem}>
                    <View style={[styles.legendColor, { backgroundColor: '#2196F3' }]} />
                    <Text style={styles.legendText}>温度(°C)</Text>
                  </View>
                  <View style={styles.legendItem}>
                    <View style={[styles.legendColor, { backgroundColor: '#FF9800' }]} />
                    <Text style={styles.legendText}>湿度(%)</Text>
                  </View>
                </View>
              </View>
            ) : (
              <View style={styles.noDataContainer}>
                <MaterialIcons name="insert-chart" size={48} color="#ccc" />
                <Paragraph style={styles.noDataText}>暂无图表数据</Paragraph>
              </View>
            )}
          </View>
        </Card.Content>
      </Card>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 12,
    backgroundColor: '#f5f5f5',
  },
  card: {
    marginBottom: 16,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    backgroundColor: '#fff',
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  environmentDataContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
    justifyContent: 'space-between',
  },
  dataItem: {
    marginRight: 24,
    marginBottom: 12,
  },
  dataItemBox: {
    width: '30%',
    backgroundColor: '#f5f7fa',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e0e6ed',
  },
  dataValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  dataLabel: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  connectionStatus: {
    width: '100%',
    marginBottom: 12,
    alignItems: 'flex-end',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
  },
  connected: {
    color: '#4CAF50',
  },
  disconnected: {
    color: '#F44336',
  },
  thresholdContainer: {
    width: '100%',
    backgroundColor: '#f5f7fa',
    borderRadius: 8,
    padding: 12,
    marginTop: 5,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e0e6ed',
  },
  thresholdHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  thresholdTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  thresholdValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FF9800',
  },
  thresholdInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  thresholdInput: {
    flex: 1,
    height: 40,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 4,
    paddingHorizontal: 10,
    backgroundColor: '#fff',
    marginRight: 10,
  },
  thresholdButton: {
    height: 40,
    justifyContent: 'center',
  },
  thresholdButtonDisabled: {
    opacity: 0.6,
  },
  inputContainer: {
    marginTop: 16,
    backgroundColor: '#f9f9f9',
    padding: 16,
    borderRadius: 8,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  inputLabel: {
    width: 80,
    fontSize: 16,
    color: '#555',
    fontWeight: '500',
  },
  textInput: {
    flex: 1,
    height: 40,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 4,
    paddingHorizontal: 12,
    backgroundColor: '#fff',
  },
  submitButton: {
    marginTop: 16,
    borderRadius: 4,
    paddingVertical: 6,
  },
  timeRangeSelector: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginVertical: 16,
  },
  timeButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginHorizontal: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    backgroundColor: '#f5f5f5',
  },
  activeTimeButton: {
    backgroundColor: '#2196F3',
    borderColor: '#2196F3',
  },
  timeText: {
    color: '#555',
    fontWeight: '500',
  },
  activeTimeText: {
    color: 'white',
    fontWeight: '500',
  },
  chartContainer: {
    backgroundColor: '#fcfcfc',
    padding: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#eee',
    marginTop: 8,
  },
  chartWrapper: {
    alignItems: 'center',
    paddingVertical: 5,
  },
  chart: {
    marginVertical: 5,
    borderRadius: 16,
  },
  statsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  statItem: {
    width: '48%',
    padding: 16,
    marginBottom: 16,
    borderRadius: 8,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  statValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
    color: 'white',
    fontWeight: '500',
  },
  chartLoader: {
    marginTop: 20,
  },
  chartLegend: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 5,
    marginBottom: 5,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 10,
  },
  legendColor: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 3,
  },
  legendText: {
    fontSize: 11,
    color: '#666',
  },
  noDataContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  noDataText: {
    color: '#ccc',
    marginTop: 10,
  },
  updateTimeContainer: {
    width: '100%',
    marginTop: 8,
    backgroundColor: '#f0f4f8',
    padding: 8,
    borderRadius: 4,
  },
  updateTimeText: {
    fontSize: 13,
    color: '#666',
    textAlign: 'center',
  },
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  chartTitle: {
    fontSize: 15,
    fontWeight: '500',
    color: '#555',
  },
  cardContent: {
    paddingHorizontal: 10,
  },
});

export default Dashboard;
