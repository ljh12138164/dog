import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { Card, Text, TextInput, Button, HelperText } from 'react-native-paper';
import { useFeedbackManagement } from '../../api/useOrdinary';

export default function FeedbackForm() {
  const { handleSubmitFeedback, isSubmitting, feedbacks } = useFeedbackManagement();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  const [titleError, setTitleError] = useState('');
  const [descriptionError, setDescriptionError] = useState('');

  // 表单验证
  const validateForm = () => {
    let isValid = true;

    if (!title.trim()) {
      setTitleError('标题不能为空');
      isValid = false;
    } else {
      setTitleError('');
    }

    if (!description.trim()) {
      setDescriptionError('详细描述不能为空');
      isValid = false;
    } else if (description.trim().length < 10) {
      setDescriptionError('详细描述至少需要10个字符');
      isValid = false;
    } else {
      setDescriptionError('');
    }

    return isValid;
  };

  // 提交反馈
  const submitFeedback = async () => {
    if (!validateForm()) {
      return;
    }

    try {
      await handleSubmitFeedback({
        title: title.trim(),
        description: description.trim(),
      });

      Alert.alert('成功', '异常反馈已提交');

      // 清空表单
      setTitle('');
      setDescription('');
    } catch (error) {
      Alert.alert('错误', `提交反馈失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Card style={styles.card}>
        <Card.Title title="提交异常反馈" subtitle="将库存管理中遇到的问题反馈给管理员" />
        <Card.Content>
          <TextInput
            label="标题"
            value={title}
            onChangeText={setTitle}
            style={styles.input}
            error={!!titleError}
          />
          {!!titleError && <HelperText type="error">{titleError}</HelperText>}

          <TextInput
            label="详细描述"
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={5}
            style={styles.input}
            error={!!descriptionError}
          />
          {!!descriptionError && <HelperText type="error">{descriptionError}</HelperText>}

          <Button
            mode="contained"
            onPress={submitFeedback}
            style={styles.button}
            loading={isSubmitting}
            disabled={isSubmitting}
          >
            提交反馈
          </Button>
        </Card.Content>
      </Card>

      {feedbacks && feedbacks.length > 0 && (
        <Card style={styles.card}>
          <Card.Title title="我的反馈记录" />
          <Card.Content>
            {feedbacks.map(feedback => (
              <View key={feedback.id} style={styles.feedbackItem}>
                <View style={styles.feedbackHeader}>
                  <Text style={styles.feedbackTitle}>{feedback.title}</Text>
                  <View
                    style={[
                      styles.statusBadge,
                      {
                        backgroundColor:
                          feedback.status === 'resolved'
                            ? '#4caf50'
                            : feedback.status === 'processing'
                              ? '#ff9800'
                              : '#2196f3',
                      },
                    ]}
                  >
                    <Text style={styles.statusText}>
                      {feedback.status === 'resolved'
                        ? '已解决'
                        : feedback.status === 'processing'
                          ? '处理中'
                          : '待处理'}
                    </Text>
                  </View>
                </View>
                <Text style={styles.feedbackDescription}>{feedback.description}</Text>
                <Text style={styles.feedbackDate}>
                  提交时间: {new Date(feedback.created_at || '').toLocaleString()}
                </Text>
              </View>
            ))}
          </Card.Content>
        </Card>
      )}
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
  input: {
    marginBottom: 8,
  },
  button: {
    marginTop: 16,
  },
  feedbackItem: {
    marginBottom: 16,
    padding: 12,
    backgroundColor: '#f5f5f5',
    borderRadius: 4,
  },
  feedbackHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  feedbackTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  statusText: {
    color: 'white',
    fontSize: 12,
  },
  feedbackDescription: {
    marginBottom: 8,
  },
  feedbackDate: {
    fontSize: 12,
    color: '#757575',
  },
});
