import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import {
  Card,
  Title,
  Button,
  Divider,
  List,
  Dialog,
  Portal,
  RadioButton,
  TextInput,
  Paragraph,
  ActivityIndicator,
  Chip,
} from 'react-native-paper';
import { useTheme } from 'react-native-paper';
import Toast from 'react-native-toast-message';
import {
  useInventoryReports,
  useGenerateInventoryReport,
  useCreateInventoryReport,
  InventoryReport,
} from '../../api/useInventory';
import DateTimePicker from '@react-native-community/datetimepicker';

const Reports = () => {
  const theme = useTheme();
  const [isGenerateDialogVisible, setGenerateDialogVisible] = useState(false);
  const [isViewReportDialogVisible, setViewReportDialogVisible] = useState(false);
  const [isCreateDialogVisible, setCreateDialogVisible] = useState(false);
  const [selectedReport, setSelectedReport] = useState<InventoryReport | null>(null);
  const [reportType, setReportType] = useState<'daily' | 'weekly' | 'monthly'>('daily');

  // 自定义报告表单
  const [customReport, setCustomReport] = useState<Partial<InventoryReport>>({
    report_type: 'custom',
    title: '',
    start_date: new Date().toISOString().split('T')[0],
    end_date: new Date().toISOString().split('T')[0],
    summary: '',
    details: '',
  });

  // 获取数据
  const { data: reports, isLoading } = useInventoryReports();
  const generateReport = useGenerateInventoryReport(Toast);
  const createReport = useCreateInventoryReport(Toast);

  // 处理生成报告
  const handleGenerateReport = () => {
    generateReport.mutate(reportType, {
      onSuccess: () => {
        setGenerateDialogVisible(false);
      },
    });
  };

  // 处理创建自定义报告
  const handleCreateCustomReport = () => {
    if (!customReport.title || !customReport.summary || !customReport.details) {
      Toast.show({
        type: 'error',
        text1: '输入错误',
        text2: '请填写所有必填字段',
      });
      return;
    }

    createReport.mutate(customReport as InventoryReport, {
      onSuccess: () => {
        setCreateDialogVisible(false);
        setCustomReport({
          report_type: 'custom',
          title: '',
          start_date: new Date().toISOString().split('T')[0],
          end_date: new Date().toISOString().split('T')[0],
          summary: '',
          details: '',
        });
      },
    });
  };

  // 处理日期选择
  const handleStartDateChange = (event: any, selectedDate?: Date) => {
    if (selectedDate) {
      setCustomReport({
        ...customReport,
        start_date: selectedDate.toISOString().split('T')[0],
      });
    }
  };

  const handleEndDateChange = (event: any, selectedDate?: Date) => {
    if (selectedDate) {
      setCustomReport({
        ...customReport,
        end_date: selectedDate.toISOString().split('T')[0],
      });
    }
  };

  // 获取报告类型标签的样式
  const getReportTypeChipStyle = (type: string) => {
    switch (type) {
      case 'daily':
        return { backgroundColor: '#4CAF50' };
      case 'weekly':
        return { backgroundColor: '#2196F3' };
      case 'monthly':
        return { backgroundColor: '#9C27B0' };
      case 'custom':
        return { backgroundColor: '#FF9800' };
      default:
        return { backgroundColor: '#9E9E9E' };
    }
  };

  return (
    <View style={styles.container}>
      <Card style={styles.card}>
        <Card.Content>
          <Title>库存报告管理</Title>

          <View style={styles.buttonContainer}>
            <Button
              mode="contained"
              onPress={() => setGenerateDialogVisible(true)}
              style={[styles.button, { backgroundColor: theme.colors.primary }]}
            >
              生成报告
            </Button>
            <Button
              mode="contained"
              onPress={() => setCreateDialogVisible(true)}
              style={[styles.button, { backgroundColor: theme.colors.secondary }]}
            >
              创建自定义报告
            </Button>
          </View>

          <Divider style={styles.divider} />

          {isLoading ? (
            <ActivityIndicator animating={true} style={styles.loader} />
          ) : reports && reports.length > 0 ? (
            <ScrollView style={styles.reportsContainer}>
              <List.Section>
                <List.Subheader>报告列表</List.Subheader>
                {reports.map(report => (
                  <List.Item
                    key={report.id}
                    title={report.title}
                    description={`${report.start_date} 至 ${report.end_date}`}
                    left={props => <List.Icon {...props} icon="file-document-outline" />}
                    right={props => (
                      <View style={styles.reportItemRight}>
                        <Chip
                          style={getReportTypeChipStyle(report.report_type)}
                          textStyle={styles.chipText}
                        >
                          {report.report_type_display}
                        </Chip>
                        <Text style={styles.dateText}>
                          {new Date(report.created_at || '').toLocaleString()}
                        </Text>
                      </View>
                    )}
                    onPress={() => {
                      setSelectedReport(report);
                      setViewReportDialogVisible(true);
                    }}
                  />
                ))}
              </List.Section>
            </ScrollView>
          ) : (
            <Text style={styles.emptyText}>暂无库存报告</Text>
          )}
        </Card.Content>
      </Card>

      {/* 生成报告对话框 */}
      <Portal>
        <Dialog visible={isGenerateDialogVisible} onDismiss={() => setGenerateDialogVisible(false)}>
          <Dialog.Title>生成库存报告</Dialog.Title>
          <Dialog.Content>
            <Paragraph>请选择要生成的报告类型：</Paragraph>
            <RadioButton.Group
              onValueChange={value => setReportType(value as any)}
              value={reportType}
            >
              <RadioButton.Item label="日报" value="daily" />
              <RadioButton.Item label="周报" value="weekly" />
              <RadioButton.Item label="月报" value="monthly" />
            </RadioButton.Group>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setGenerateDialogVisible(false)}>取消</Button>
            <Button onPress={handleGenerateReport} loading={generateReport.isPending}>
              生成
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      {/* 查看报告对话框 */}
      <Portal>
        <Dialog
          visible={isViewReportDialogVisible}
          onDismiss={() => setViewReportDialogVisible(false)}
        >
          <Dialog.Title>
            {selectedReport?.title}
            <Chip
              style={selectedReport ? getReportTypeChipStyle(selectedReport.report_type) : {}}
              textStyle={styles.chipText}
            >
              {selectedReport?.report_type_display}
            </Chip>
          </Dialog.Title>
          <Dialog.Content>
            <ScrollView style={styles.reportScrollView}>
              <View style={styles.reportHeader}>
                <Text style={styles.reportLabel}>时间范围：</Text>
                <Text style={styles.reportValue}>
                  {selectedReport?.start_date} 至 {selectedReport?.end_date}
                </Text>
              </View>

              <View style={styles.reportSection}>
                <Text style={styles.reportSectionTitle}>摘要</Text>
                <Text style={styles.reportText}>{selectedReport?.summary}</Text>
              </View>

              <View style={styles.reportSection}>
                <Text style={styles.reportSectionTitle}>详细内容</Text>
                <Text style={styles.reportText}>{selectedReport?.details}</Text>
              </View>

              <View style={styles.reportFooter}>
                <Text style={styles.reportLabel}>创建者：</Text>
                <Text style={styles.reportValue}>{selectedReport?.created_by_name}</Text>
                <Text style={styles.reportLabel}>创建时间：</Text>
                <Text style={styles.reportValue}>
                  {selectedReport?.created_at
                    ? new Date(selectedReport.created_at).toLocaleString()
                    : ''}
                </Text>
              </View>
            </ScrollView>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setViewReportDialogVisible(false)}>关闭</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      {/* 创建自定义报告对话框 */}
      <Portal>
        <Dialog visible={isCreateDialogVisible} onDismiss={() => setCreateDialogVisible(false)}>
          <Dialog.Title>创建自定义报告</Dialog.Title>
          <Dialog.Content>
            <ScrollView style={styles.customReportForm}>
              <TextInput
                label="报告标题"
                value={customReport.title}
                onChangeText={text => setCustomReport({ ...customReport, title: text })}
                style={styles.input}
              />

              <View style={styles.datePickerContainer}>
                <Text style={styles.datePickerLabel}>开始日期：</Text>
                <DateTimePicker
                  value={new Date(customReport.start_date || '')}
                  mode="date"
                  display="default"
                  onChange={handleStartDateChange}
                />
              </View>

              <View style={styles.datePickerContainer}>
                <Text style={styles.datePickerLabel}>结束日期：</Text>
                <DateTimePicker
                  value={new Date(customReport.end_date || '')}
                  mode="date"
                  display="default"
                  onChange={handleEndDateChange}
                />
              </View>

              <TextInput
                label="摘要"
                value={customReport.summary}
                onChangeText={text => setCustomReport({ ...customReport, summary: text })}
                multiline
                numberOfLines={3}
                style={styles.input}
              />

              <TextInput
                label="详细内容"
                value={customReport.details}
                onChangeText={text => setCustomReport({ ...customReport, details: text })}
                multiline
                numberOfLines={6}
                style={styles.input}
              />
            </ScrollView>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setCreateDialogVisible(false)}>取消</Button>
            <Button onPress={handleCreateCustomReport} loading={createReport.isPending}>
              创建
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </View>
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
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 16,
  },
  button: {
    flex: 1,
    marginHorizontal: 8,
  },
  divider: {
    marginBottom: 16,
  },
  reportsContainer: {
    maxHeight: 500,
  },
  loader: {
    marginVertical: 16,
  },
  emptyText: {
    textAlign: 'center',
    marginVertical: 16,
    fontSize: 16,
    color: '#666',
  },
  reportItemRight: {
    alignItems: 'flex-end',
  },
  chipText: {
    color: 'white',
  },
  dateText: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  reportScrollView: {
    maxHeight: 400,
  },
  reportHeader: {
    marginBottom: 16,
  },
  reportSection: {
    marginBottom: 16,
  },
  reportSectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  reportText: {
    fontSize: 14,
    lineHeight: 20,
  },
  reportFooter: {
    marginTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    paddingTop: 8,
  },
  reportLabel: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  reportValue: {
    fontSize: 14,
    marginBottom: 8,
  },
  customReportForm: {
    maxHeight: 400,
  },
  input: {
    marginBottom: 12,
  },
  datePickerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  datePickerLabel: {
    marginRight: 8,
    fontSize: 16,
  },
});

export default Reports;
