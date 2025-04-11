import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { Card, Text, List, Button, Dialog, Paragraph, Portal, Chip } from 'react-native-paper';
import { useTaskManagement, Task } from '../../api/useOrdinary';
import { format } from 'date-fns';

export default function TaskList() {
  const { tasks, isLoadingTasks, handleCompleteTask, isCompleting } = useTaskManagement();
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [visible, setVisible] = useState(false);

  const showTaskDetail = (task: Task) => {
    setSelectedTask(task);
    setVisible(true);
  };

  const hideDialog = () => {
    setVisible(false);
  };

  const completeTask = async () => {
    if (!selectedTask) return;

    try {
      await handleCompleteTask(selectedTask?.id!);
      Alert.alert('成功', '任务已标记为已完成');
      hideDialog();
    } catch (error) {
      Alert.alert('错误', `无法完成任务: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  };

  if (isLoadingTasks) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" />
        <Text style={styles.loadingText}>加载任务中...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <Card style={styles.card}>
        <Card.Title
          title="待办任务"
          subtitle={tasks && tasks.length > 0 ? `共 ${tasks.length} 个任务` : '暂无任务'}
        />
        <Card.Content>
          {!tasks || tasks.length === 0 ? (
            <Text style={styles.emptyText}>当前没有待办任务</Text>
          ) : (
            tasks.map(task => (
              <List.Item
                key={task.id}
                title={task.title}
                description={`截止日期: ${task.due_date ? format(new Date(task.due_date), 'yyyy-MM-dd') : '未知'}`}
                onPress={() => showTaskDetail(task)}
                left={props => (
                  <List.Icon
                    {...props}
                    icon={task.status === 'completed' ? 'check-circle' : 'clock-outline'}
                  />
                )}
              />
            ))
          )}
        </Card.Content>
      </Card>

      <Portal>
        <Dialog visible={visible} onDismiss={hideDialog}>
          <Dialog.Title>{selectedTask?.title}</Dialog.Title>
          <Dialog.Content>
            <Paragraph style={styles.dialogContent}>{selectedTask?.description}</Paragraph>
            <View style={styles.taskInfo}>
              <Text style={styles.taskInfoItem}>
                <Text style={styles.taskInfoLabel}>截止日期: </Text>
                {selectedTask?.due_date
                  ? format(new Date(selectedTask.due_date), 'yyyy-MM-dd')
                  : ''}
              </Text>
              <Text style={styles.taskInfoItem}>
                <Text style={styles.taskInfoLabel}>优先级: </Text>
                {selectedTask?.priority === 'high'
                  ? '高'
                  : selectedTask?.priority === 'medium'
                    ? '中'
                    : '低'}
              </Text>
              <Text style={styles.taskInfoItem}>
                <Text style={styles.taskInfoLabel}>状态: </Text>
                {selectedTask?.status === 'completed' ? '已完成' : '待处理'}
              </Text>
            </View>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={hideDialog}>关闭</Button>
            {selectedTask?.status !== 'completed' && (
              <Button
                mode="contained"
                onPress={completeTask}
                loading={isCompleting}
                disabled={isCompleting}
              >
                标记为已完成
              </Button>
            )}
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  card: {
    marginBottom: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
  },
  emptyText: {
    textAlign: 'center',
    marginVertical: 20,
    fontSize: 16,
    color: '#757575',
  },
  rightContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dialogContent: {
    marginBottom: 16,
  },
  taskInfo: {
    backgroundColor: '#f5f5f5',
    padding: 10,
    borderRadius: 4,
  },
  taskInfoItem: {
    marginBottom: 4,
  },
  taskInfoLabel: {
    fontWeight: 'bold',
  },
});
