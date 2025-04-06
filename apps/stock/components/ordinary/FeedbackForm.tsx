import { Feedback } from '@/api/types';
import React, { useState } from 'react';
import { Alert, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import {
  Button,
  Card,
  Divider,
  HelperText,
  IconButton,
  Modal,
  Portal,
  Text,
  TextInput,
} from 'react-native-paper';
import { useFeedbackManagement } from '../../api/useOrdinary';

// 定义评论类型，仅用于渲染
interface Comment {
  id: number;
  content: string;
  created_by_username: string;
  created_at: string;
}

export default function FeedbackForm() {
  const { handleSubmitFeedback, isSubmitting, feedbacks } = useFeedbackManagement();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  const [titleError, setTitleError] = useState('');
  const [descriptionError, setDescriptionError] = useState('');

  // 用于反馈详情模态框
  const [selectedFeedback, setSelectedFeedback] = useState<Feedback | null>(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);

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

  // 查看反馈详情
  const viewFeedbackDetail = (feedback: Feedback) => {
    setSelectedFeedback(feedback);
    setDetailModalVisible(true);
  };

  // 渲染反馈状态标签
  const renderStatusLabel = (status: string) => {
    let color = '';
    let text = '';
    switch (status) {
      case 'resolved':
        color = '#4caf50';
        text = '已解决';
        break;
      case 'processing':
        color = '#ff9800';
        text = '处理中';
        break;
      default:
        color = '#2196f3';
        text = '待处理';
    }
    return { color, text };
  };

  return (
    <ScrollView style={styles.container}>
      <Card style={styles.card}>
        <Card.Content>
          <View style={styles.titleContainer}>
            <Text style={styles.mainTitle}>提交异常反馈</Text>
            <Text style={styles.subtitle}>将库存管理中遇到的问题反馈给管理员</Text>
          </View>

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
            style={styles.textAreaInput}
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
                <Text style={styles.feedbackDescription} numberOfLines={2}>
                  {feedback.description}
                </Text>
                <View style={styles.feedbackFooter}>
                  <Text style={styles.feedbackDate}>
                    提交时间: {new Date(feedback.created_at || '').toLocaleString()}
                  </Text>
                  <TouchableOpacity onPress={() => viewFeedbackDetail(feedback)}>
                    <Text style={styles.viewDetailButton}>查看详情</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </Card.Content>
        </Card>
      )}

      {/* 反馈详情模态框 */}
      <Portal>
        <Modal
          visible={detailModalVisible}
          onDismiss={() => setDetailModalVisible(false)}
          contentContainerStyle={styles.modalContainer}
        >
          {selectedFeedback && (
            <ScrollView>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>{selectedFeedback.title}</Text>
                <IconButton icon="close" size={24} onPress={() => setDetailModalVisible(false)} />
              </View>

              <View style={styles.detailStatusContainer}>
                <View
                  style={[
                    styles.detailStatusBadge,
                    {
                      backgroundColor: renderStatusLabel(selectedFeedback.status || 'pending')
                        .color,
                    },
                  ]}
                >
                  <Text style={styles.statusText}>
                    {renderStatusLabel(selectedFeedback.status || 'pending').text}
                  </Text>
                </View>
              </View>

              <Divider style={styles.divider} />

              <View style={styles.detailSection}>
                <Text style={styles.sectionTitle}>详细描述</Text>
                <Text style={styles.detailContent}>{selectedFeedback.description}</Text>
              </View>

              <View style={styles.detailSection}>
                <Text style={styles.sectionTitle}>提交时间</Text>
                <Text style={styles.detailContent}>
                  {selectedFeedback.created_at
                    ? new Date(selectedFeedback.created_at).toLocaleString()
                    : '未知'}
                </Text>
              </View>

              {selectedFeedback.updated_at &&
                selectedFeedback.created_at &&
                selectedFeedback.updated_at !== selectedFeedback.created_at && (
                  <View style={styles.detailSection}>
                    <Text style={styles.sectionTitle}>更新时间</Text>
                    <Text style={styles.detailContent}>
                      {new Date(selectedFeedback.updated_at).toLocaleString()}
                    </Text>
                  </View>
                )}

              {selectedFeedback.resolved_at && (
                <View style={styles.detailSection}>
                  <Text style={styles.sectionTitle}>解决时间</Text>
                  <Text style={styles.detailContent}>
                    {new Date(selectedFeedback.resolved_at).toLocaleString()}
                  </Text>
                </View>
              )}

              {selectedFeedback.handler_name && (
                <View style={styles.detailSection}>
                  <Text style={styles.sectionTitle}>处理人</Text>
                  <Text style={styles.detailContent}>{selectedFeedback.handler_name}</Text>
                </View>
              )}

              {selectedFeedback.resolution_notes && (
                <View style={styles.detailSection}>
                  <Text style={styles.sectionTitle}>处理说明</Text>
                  <Text style={styles.detailContent}>{selectedFeedback.resolution_notes}</Text>
                </View>
              )}

              {Array.isArray(selectedFeedback.comments) && selectedFeedback.comments.length > 0 && (
                <View style={styles.detailSection}>
                  <Text style={styles.sectionTitle}>评论记录</Text>
                  {selectedFeedback.comments.map((comment, index) => (
                    <View key={index} style={styles.commentItem}>
                      <View style={styles.commentHeader}>
                        <Text style={styles.commentUser}>{comment.created_by_username}</Text>
                        <Text style={styles.commentDate}>
                          {new Date(comment.created_at).toLocaleString()}
                        </Text>
                      </View>
                      <Text style={styles.commentContent}>{comment.content}</Text>
                    </View>
                  ))}
                </View>
              )}
            </ScrollView>
          )}
        </Modal>
      </Portal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#f5f5f5', // 更浅的背景色
  },
  card: {
    marginBottom: 16,
    backgroundColor: 'white',
    borderRadius: 10,
    elevation: 1, // 更轻的阴影
    borderWidth: 0,
  },
  titleContainer: {
    marginBottom: 20,
  },
  mainTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  input: {
    marginBottom: 12,
    backgroundColor: 'white',
    borderWidth: 0,
    fontSize: 15,
  },
  textAreaInput: {
    marginBottom: 12,
    backgroundColor: 'white',
    borderWidth: 0,
    fontSize: 15,
    height: 120, // 增大文本区域高度
  },
  button: {
    marginTop: 16,
    backgroundColor: '#0088ff', // 更亮的蓝色
    borderRadius: 25,
    paddingVertical: 5,
  },
  feedbackItem: {
    marginBottom: 12,
    padding: 16,
    backgroundColor: 'white',
    borderRadius: 10,
    borderWidth: 0,
    elevation: 1,
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
    color: '#333',
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
  },
  statusText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '500',
  },
  feedbackDescription: {
    marginBottom: 8,
    color: '#555',
    fontSize: 14,
    lineHeight: 20,
  },
  feedbackDate: {
    fontSize: 12,
    color: '#888',
  },
  feedbackFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  viewDetailButton: {
    color: '#0088ff',
    fontWeight: 'bold',
    fontSize: 13,
  },
  modalContainer: {
    backgroundColor: 'white',
    padding: 20,
    margin: 20,
    borderRadius: 12,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  detailStatusContainer: {
    marginTop: 5,
    marginBottom: 15,
    flexDirection: 'row',
  },
  detailStatusBadge: {
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 16,
  },
  divider: {
    marginVertical: 15,
    height: 1,
    backgroundColor: '#eee',
  },
  detailSection: {
    marginBottom: 18,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#666',
    marginBottom: 6,
  },
  detailContent: {
    fontSize: 14,
    lineHeight: 22,
    color: '#444',
  },
  commentItem: {
    marginTop: 12,
    padding: 12,
    backgroundColor: '#f8f8f8',
    borderRadius: 6,
    borderLeftWidth: 2,
    borderLeftColor: '#0088ff',
  },
  commentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  commentUser: {
    fontWeight: 'bold',
    fontSize: 13,
    color: '#444',
  },
  commentDate: {
    fontSize: 11,
    color: '#888',
  },
  commentContent: {
    fontSize: 13,
    color: '#333',
    lineHeight: 18,
  },
});
