import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Card, Title, Paragraph, Button, ActivityIndicator, useTheme } from 'react-native-paper';
import { LineChart } from 'react-native-chart-kit';
import { Dimensions } from 'react-native';
import Toast from 'react-native-toast-message';
import {
  useLatestEnvironmentData,
  useEnvironmentChartData,
  useCreateEnvironmentData,
} from '../../api/useInventory';
import { useIngredientList } from '../../api/useEmployee';

const screenWidth = Dimensions.get('window').width;

const Dashboard = () => {
  const theme = useTheme();
  const [timeRange, setTimeRange] = useState<'day' | 'week' | 'month'>('day');
  const [newTemp, setNewTemp] = useState('');
  const [newHumidity, setNewHumidity] = useState('');

  const { data: latestData, isLoading: isLoadingLatest } = useLatestEnvironmentData();
  const { data: chartData, isLoading: isLoadingChart } = useEnvironmentChartData(timeRange);
  const { data: ingredients, isLoading: isLoadingIngredients } = useIngredientList();
  const createEnvironmentData = useCreateEnvironmentData(Toast);

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

    createEnvironmentData.mutate({
      temperature: temp,
      humidity: humidity,
    });

    setNewTemp('');
    setNewHumidity('');
  };

  // 准备图表数据
  const prepareChartData = () => {
    if (!chartData || chartData.length === 0) {
      return {
        labels: [],
        datasets: [
          { data: [], color: () => theme.colors.primary },
          { data: [], color: () => theme.colors.secondary },
        ],
      };
    }

    // 提取数据点
    const labels = chartData.map(d => {
      const date = new Date(d.recorded_at || '');
      if (timeRange === 'day') {
        return `${date.getHours()}:${date.getMinutes().toString().padStart(2, '0')}`;
      } else if (timeRange === 'week') {
        return `${date.getMonth() + 1}/${date.getDate()}`;
      } else {
        return `${date.getMonth() + 1}/${date.getDate()}`;
      }
    });

    // 只保留部分标签以防止重叠
    const filteredLabels = labels.filter((_, i) => i % Math.ceil(labels.length / 6) === 0);

    const temperaturesData = chartData.map(d => d.temperature);
    const humidityData = chartData.map(d => d.humidity);

    return {
      labels: filteredLabels,
      datasets: [
        {
          data: temperaturesData,
          color: () => theme.colors.primary,
          strokeWidth: 2,
        },
        {
          data: humidityData,
          color: () => theme.colors.secondary,
          strokeWidth: 2,
        },
      ],
    };
  };

  const inventoryStats = getInventoryStats();
  const chartDataFormatted = prepareChartData();

  return (
    <ScrollView style={styles.container}>
      <Card style={styles.card}>
        <Card.Content>
          <Title>当前环境数据</Title>
          {isLoadingLatest ? (
            <ActivityIndicator animating={true} />
          ) : latestData ? (
            <View style={styles.environmentDataContainer}>
              <View style={styles.dataItem}>
                <Text style={styles.dataValue}>{latestData.temperature}°C</Text>
                <Text style={styles.dataLabel}>温度</Text>
              </View>
              <View style={styles.dataItem}>
                <Text style={styles.dataValue}>{latestData.humidity}%</Text>
                <Text style={styles.dataLabel}>湿度</Text>
              </View>
              <View style={styles.dataItem}>
                <Text style={styles.dataLabel}>
                  更新时间: {new Date(latestData.recorded_at || '').toLocaleString()}
                </Text>
              </View>
            </View>
          ) : (
            <Paragraph>暂无环境数据</Paragraph>
          )}
        </Card.Content>
      </Card>

      <Card style={styles.card}>
        <Card.Content>
          <Title>手动记录环境数据</Title>
          <View style={styles.inputContainer}>
            <View style={styles.inputRow}>
              <Text style={styles.inputLabel}>温度 (°C):</Text>
              <input
                style={styles.textInput}
                type="number"
                value={newTemp}
                onChange={e => setNewTemp(e.target.value)}
                placeholder="输入温度"
              />
            </View>
            <View style={styles.inputRow}>
              <Text style={styles.inputLabel}>湿度 (%):</Text>
              <input
                style={styles.textInput}
                type="number"
                value={newHumidity}
                onChange={e => setNewHumidity(e.target.value)}
                placeholder="输入湿度"
              />
            </View>
            <Button
              mode="contained"
              onPress={handleSubmitEnvironmentData}
              loading={createEnvironmentData.isPending}
              style={styles.submitButton}
            >
              提交数据
            </Button>
          </View>
        </Card.Content>
      </Card>

      <Card style={styles.card}>
        <Card.Content>
          <Title>环境数据走势</Title>
          <View style={styles.timeRangeSelector}>
            <TouchableOpacity
              style={[styles.timeButton, timeRange === 'day' && styles.activeTimeButton]}
              onPress={() => setTimeRange('day')}
            >
              <Text style={timeRange === 'day' ? styles.activeTimeText : styles.timeText}>天</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.timeButton, timeRange === 'week' && styles.activeTimeButton]}
              onPress={() => setTimeRange('week')}
            >
              <Text style={timeRange === 'week' ? styles.activeTimeText : styles.timeText}>周</Text>
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

          {isLoadingChart ? (
            <ActivityIndicator animating={true} />
          ) : chartData && chartData.length > 0 ? (
            <View>
              <LineChart
                data={chartDataFormatted}
                width={screenWidth - 40}
                height={220}
                yAxisLabel=""
                yAxisSuffix=""
                chartConfig={{
                  backgroundColor: theme.colors.background,
                  backgroundGradientFrom: theme.colors.background,
                  backgroundGradientTo: theme.colors.background,
                  decimalPlaces: 1,
                  color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                  labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                  style: {
                    borderRadius: 16,
                  },
                  propsForDots: {
                    r: '4',
                    strokeWidth: '1',
                    stroke: theme.colors.primary,
                  },
                }}
                style={styles.chart}
                bezier
              />
            </View>
          ) : (
            <Paragraph>暂无图表数据</Paragraph>
          )}
        </Card.Content>
      </Card>

      <Card style={styles.card}>
        <Card.Content>
          <Title>库存概览</Title>
          {isLoadingIngredients ? (
            <ActivityIndicator animating={true} />
          ) : (
            <View style={styles.statsContainer}>
              <View style={[styles.statItem, { backgroundColor: theme.colors.primary }]}>
                <Text style={styles.statValue}>{inventoryStats.total}</Text>
                <Text style={styles.statLabel}>总数</Text>
              </View>
              <View style={[styles.statItem, { backgroundColor: '#4CAF50' }]}>
                <Text style={styles.statValue}>{inventoryStats.normal}</Text>
                <Text style={styles.statLabel}>正常</Text>
              </View>
              <View style={[styles.statItem, { backgroundColor: '#FFC107' }]}>
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
      </Card>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#f5f5f5',
  },
  card: {
    marginBottom: 16,
    elevation: 2,
  },
  environmentDataContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
  },
  dataItem: {
    marginRight: 24,
    marginBottom: 8,
  },
  dataValue: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  dataLabel: {
    fontSize: 14,
    color: '#666',
  },
  inputContainer: {
    marginTop: 8,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  inputLabel: {
    width: 80,
    fontSize: 16,
  },
  textInput: {
    flex: 1,
    height: 40,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 4,
    paddingHorizontal: 8,
  },
  submitButton: {
    marginTop: 8,
  },
  timeRangeSelector: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginVertical: 12,
  },
  timeButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    marginHorizontal: 4,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#ddd',
    backgroundColor: '#f0f0f0',
  },
  activeTimeButton: {
    backgroundColor: '#2196F3',
    borderColor: '#2196F3',
  },
  timeText: {
    color: '#333',
  },
  activeTimeText: {
    color: 'white',
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16,
  },
  statsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  statItem: {
    width: '48%',
    padding: 16,
    marginBottom: 8,
    borderRadius: 4,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
  },
  statLabel: {
    fontSize: 14,
    color: 'white',
  },
  legendContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 10,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 20,
  },
  legendColor: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 6,
  },
  legendText: {
    fontSize: 12,
  },
});

export default Dashboard;
