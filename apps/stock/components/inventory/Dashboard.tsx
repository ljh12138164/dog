import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput } from 'react-native';
import { Card, Title, Paragraph, Button, ActivityIndicator, useTheme } from 'react-native-paper';
import { LineChart } from 'react-native-chart-kit';
import { Dimensions } from 'react-native';
import Toast from 'react-native-toast-message';
import {
  useLatestEnvironmentData,
  useEnvironmentChartData,
  useCreateEnvironmentData,
  useLatestSensorData,
  useSensorChartData,
  useCreateSensorData,
  SensorChartResponse,
} from '../../api/useInventory';
import { useIngredientList } from '../../api/useEmployee';
import { MaterialIcons } from '@expo/vector-icons';

const screenWidth = Dimensions.get('window').width;

const Dashboard = () => {
  const [timeRange, setTimeRange] = useState<'day' | 'week' | 'month'>('day');
  const [newTemp, setNewTemp] = useState('');
  const [newHumidity, setNewHumidity] = useState('');

  // 获取传感器数据
  const { data: latestSensorData, isLoading: isLoadingSensor } = useLatestSensorData();
  const { data: sensorChartData, isLoading: isLoadingSensorChart } = useSensorChartData(
    timeRange === 'day' ? { hours: 24 } : timeRange === 'week' ? { days: 7 } : { days: 30 },
  );

  const { data: ingredients, isLoading: isLoadingIngredients } = useIngredientList();
  const createEnvironmentData = useCreateEnvironmentData(Toast);
  const createSensorData = useCreateSensorData(Toast);

  // 计算库存统计信息
  const getInventoryStats = () => {
    if (!ingredients) return { total: 0, normal: 0, low: 0, expired: 0, pendingCheck: 0 };

    const stats = {
      total: ingredients.length,
      normal: ingredients.filter(i => i.status === 'normal').length,
      low: ingredients.filter(i => i.status === 'low').length,
      expired: ingredients.filter(i => i.status === 'expired').length,
      pendingCheck: ingredients.filter(i => i.status === 'pending_check').length,
    };

    return stats;
  };

  const handleSubmitEnvironmentData = () => {
    if (!newTemp || !newHumidity) {
      Toast.show({
        type: 'error',
        text1: '输入错误',
        text2: '请输入温度和湿度数值',
      });
      return;
    }

    const temp = parseFloat(newTemp);
    const humidity = parseFloat(newHumidity);

    if (isNaN(temp) || isNaN(humidity)) {
      Toast.show({
        type: 'error',
        text1: '输入错误',
        text2: '温度和湿度必须是数字',
      });
      return;
    }

    // 使用传感器数据API而不是环境数据API
    createSensorData.mutate({
      temperature: temp,
      humidity: humidity,
    });

    setNewTemp('');
    setNewHumidity('');
  };

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

  const inventoryStats = getInventoryStats();
  const chartDataFormatted = prepareChartData();

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
                <Text style={styles.dataValue}>
                  {typeof latestSensorData.temperature === 'object' &&
                  Array.isArray(latestSensorData.temperature)
                    ? latestSensorData.temperature[0] || 0
                    : latestSensorData.temperature || 0}
                  °C
                </Text>
                <Text style={styles.dataLabel}>温度</Text>
              </View>
              <View style={styles.dataItemBox}>
                <Text style={styles.dataValue}>
                  {typeof latestSensorData.humidity === 'object' &&
                  Array.isArray(latestSensorData.humidity)
                    ? latestSensorData.humidity[0] || 0
                    : latestSensorData.humidity || 0}
                  %
                </Text>
                <Text style={styles.dataLabel}>湿度</Text>
              </View>
              {latestSensorData.light !== undefined && (
                <View style={styles.dataItemBox}>
                  <Text style={styles.dataValue}>
                    {typeof latestSensorData.light === 'object' &&
                    Array.isArray(latestSensorData.light)
                      ? latestSensorData.light[0] || 0
                      : latestSensorData.light || 0}
                  </Text>
                  <Text style={styles.dataLabel}>光照</Text>
                </View>
              )}
              <View style={styles.updateTimeContainer}>
                <Text style={styles.updateTimeText}>
                  更新时间:{' '}
                  {new Date(
                    typeof latestSensorData.timestamps === 'object' &&
                    Array.isArray(latestSensorData.timestamps)
                      ? latestSensorData.timestamps[0] || ''
                      : latestSensorData.timestamp || '',
                  ).toLocaleString()}
                </Text>
              </View>
            </View>
          ) : (
            <Paragraph>暂无环境数据</Paragraph>
          )}
        </Card.Content>
      </Card>
      {/* 
      <Card style={styles.card}>
        <Card.Content>
          <Title style={styles.cardTitle}>手动记录环境数据</Title>
          <View style={styles.inputContainer}>
            <View style={styles.inputRow}>
              <Text style={styles.inputLabel}>温度 (°C):</Text>
              <TextInput
                style={styles.textInput}
                keyboardType="numeric"
                value={newTemp}
                onChangeText={setNewTemp}
                placeholder="输入温度"
              />
            </View>
            <View style={styles.inputRow}>
              <Text style={styles.inputLabel}>湿度 (%):</Text>
              <TextInput
                style={styles.textInput}
                keyboardType="numeric"
                value={newHumidity}
                onChangeText={setNewHumidity}
                placeholder="输入湿度"
              />
            </View>
            <Button
              mode="contained"
              onPress={handleSubmitEnvironmentData}
              loading={createSensorData.isPending}
              style={styles.submitButton}
              color="#2196F3"
            >
              提交数据
            </Button>
          </View>
        </Card.Content>
      </Card> */}

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
      {/* 
      <Card style={styles.card}>
        <Card.Content>
          <Title style={styles.cardTitle}>库存概览</Title>
          {isLoadingIngredients ? (
            <ActivityIndicator animating={true} color="#2196F3" />
          ) : (
            <View style={styles.statsContainer}>
              <View style={[styles.statItem, { backgroundColor: '#2196F3' }]}>
                <Text style={styles.statValue}>{inventoryStats.total}</Text>
                <Text style={styles.statLabel}>总数</Text>
              </View>
              <View style={[styles.statItem, { backgroundColor: '#4CAF50' }]}>
                <Text style={styles.statValue}>{inventoryStats.normal}</Text>
                <Text style={styles.statLabel}>正常</Text>
              </View>
              <View style={[styles.statItem, { backgroundColor: '#FF9800' }]}>
                <Text style={styles.statValue}>{inventoryStats.low}</Text>
                <Text style={styles.statLabel}>库存不足</Text>
              </View>
              <View style={[styles.statItem, { backgroundColor: '#F44336' }]}>
                <Text style={styles.statValue}>{inventoryStats.expired}</Text>
                <Text style={styles.statLabel}>已过期</Text>
              </View>
              <View style={[styles.statItem, { backgroundColor: '#9C27B0' }]}>
                <Text style={styles.statValue}>{inventoryStats?.pendingCheck || 0}</Text>
                <Text style={styles.statLabel}>待检查</Text>
              </View>
            </View>
          )}
        </Card.Content>
      </Card> */}
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
