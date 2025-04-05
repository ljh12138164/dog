import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Card,
  Typography,
  Tag,
  Divider,
  Button,
  Form,
  Input,
  List,
  Avatar,
  Skeleton,
  Result,
  Space,
  Descriptions,
} from 'antd';
import { ArrowLeftOutlined, CommentOutlined, UserOutlined } from '@ant-design/icons';
import {
  useFeedback,
  useFeedbackComments,
  useCreateFeedbackComment,
  CreateCommentRequest,
} from '../../../api/useFeekback';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;

const FeedbackStatusTag = ({ status }: { status: string }) => {
  let color = 'default';
  let text = '未知';

  switch (status) {
    case 'pending':
      color = 'blue';
      text = '待处理';
      break;
    case 'processing':
      color = 'orange';
      text = '处理中';
      break;
    case 'resolved':
      color = 'green';
      text = '已解决';
      break;
  }

  return <Tag color={color}>{text}</Tag>;
};

const FeedbackDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [commentForm] = Form.useForm();
  const feedbackId = parseInt(id || '0');

  // 获取反馈详情
  const {
    data: feedback,
    isLoading: isLoadingFeedback,
    isError: isErrorFeedback,
  } = useFeedback(feedbackId);

  // 获取评论列表
  const {
    data: comments,
    isLoading: isLoadingComments,
    refetch: refetchComments,
  } = useFeedbackComments(feedbackId);

  // 创建评论
  const createComment = useCreateFeedbackComment();

  const handleSubmitComment = () => {
    commentForm.validateFields().then(values => {
      const data: CreateCommentRequest = {
        content: values.content,
      };

      createComment.mutate(
        {
          feedbackId,
          data,
        },
        {
          onSuccess: () => {
            commentForm.resetFields();
            refetchComments();
          },
        },
      );
    });
  };

  if (isErrorFeedback) {
    return (
      <Result
        status="404"
        title="404"
        subTitle="对不起，您访问的反馈不存在"
        extra={
          <Button type="primary" onClick={() => navigate('/feedback')}>
            返回反馈列表
          </Button>
        }
      />
    );
  }

  return (
    <div>
      <Button
        type="link"
        icon={<ArrowLeftOutlined />}
        onClick={() => navigate('/feedback')}
        style={{ marginBottom: 16, padding: 0 }}
      >
        返回反馈列表
      </Button>

      <Card loading={isLoadingFeedback}>
        {feedback && (
          <>
            <div
              style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}
            >
              <Title level={4}>{feedback.title}</Title>
              <FeedbackStatusTag status={feedback.status} />
            </div>

            <Descriptions bordered size="small" column={2} style={{ marginTop: 16 }}>
              <Descriptions.Item label="创建时间">
                {new Date(feedback.created_at).toLocaleString('zh-CN')}
              </Descriptions.Item>
              <Descriptions.Item label="更新时间">
                {new Date(feedback.updated_at).toLocaleString('zh-CN')}
              </Descriptions.Item>
              {feedback.resolved_at && (
                <Descriptions.Item label="解决时间">
                  {new Date(feedback.resolved_at).toLocaleString('zh-CN')}
                </Descriptions.Item>
              )}
            </Descriptions>

            <Divider orientation="left">详细描述</Divider>
            <Paragraph>{feedback.description}</Paragraph>

            <Divider orientation="left">
              <Space>
                <CommentOutlined />
                评论
              </Space>
            </Divider>

            <List
              loading={isLoadingComments}
              dataSource={comments || []}
              locale={{ emptyText: '暂无评论' }}
              renderItem={item => (
                <List.Item>
                  <List.Item.Meta
                    avatar={<Avatar src={item.created_by_avatar} icon={<UserOutlined />} />}
                    title={
                      <Space>
                        <Text strong>{item.created_by_username}</Text>
                        <Text type="secondary" style={{ fontSize: '12px' }}>
                          {new Date(item.created_at).toLocaleString('zh-CN')}
                        </Text>
                      </Space>
                    }
                    description={item.content}
                  />
                </List.Item>
              )}
            />

            <Divider />

            <Form form={commentForm} layout="vertical">
              <Form.Item name="content" rules={[{ required: true, message: '请输入评论内容' }]}>
                <TextArea rows={4} placeholder="请输入评论内容" maxLength={500} />
              </Form.Item>
              <Form.Item>
                <Button
                  type="primary"
                  onClick={handleSubmitComment}
                  loading={createComment.isPending}
                >
                  提交评论
                </Button>
              </Form.Item>
            </Form>
          </>
        )}
      </Card>
    </div>
  );
};

export default FeedbackDetail;
