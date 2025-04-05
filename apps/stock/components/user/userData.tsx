import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import Constants from 'expo-constants';
import * as ImagePicker from 'expo-image-picker';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Toast from 'react-native-toast-message';
import {
  useCurrentUser,
  logout,
  useUploadAvatar,
  clearAuthData,
  useUpdateUserInfo,
  UpdateUserInfoRequest,
  useChangePassword,
  ChangePasswordRequest,
} from '../../api/useAuth';
import { useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import apiClient from '../../api/http';

// 获取用户类型标签
const getUserTypeLabel = (userType?: string) => {
  switch (userType) {
    case 'admin':
      return '系统管理员';
    case 'inventory':
      return '库存管理员';
    case 'procurement':
      return '采购经理';
    case 'logistics':
      return '物流管理员';
    case 'employee':
      return '普通员工';
    default:
      return '用户';
  }
};

export default function UserData() {
  // 获取当前用户信息
  const { data: user, isLoading } = useCurrentUser();
  // 登出hook
  const router = useRouter();
  const queryClient = useQueryClient();
  // 添加修改信息状态
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');

  // 上传头像hook
  const { mutate: uploadAvatar, isPending: isUploading } = useUploadAvatar(Toast);
  // 更新用户信息hook
  const { mutate: updateUserInfo, isPending: updateLoading } = useUpdateUserInfo(Toast);
  // 修改密码hook
  const { mutate: changePassword, isPending: passwordLoading } = useChangePassword(Toast);

  // 添加状态控制帮助中心和关于我们弹窗
  const [helpModalVisible, setHelpModalVisible] = useState(false);
  const [aboutModalVisible, setAboutModalVisible] = useState(false);
  // 添加修改密码状态
  const [passwordModalVisible, setPasswordModalVisible] = useState(false);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const handleLogout = async () => {
    await clearAuthData();
    // 清除React Query缓存
    queryClient.clear();
    Toast.show({
      type: 'success',
      text1: '退出登录成功',
    });
    // 路由跳转时添加参数，与修改密码保持一致的处理方式
    router.replace({
      pathname: '/(auth)/login',
      params: { fromLogout: 'true' },
    });
  };

  // 处理选择和上传头像
  const handleAvatarChange = async () => {
    try {
      // 请求媒体库权限
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permissionResult.granted) {
        Alert.alert('需要权限', '请授予访问相册的权限以选择头像图片');
        return;
      }

      // 启动图片选择器
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const selectedImage = result.assets[0];

        // 获取文件URI
        const fileUri =
          Platform.OS === 'ios' ? selectedImage.uri.replace('file://', '') : selectedImage.uri;

        // 直接传递文件URI到上传函数
        uploadAvatar(fileUri);
      }
    } catch (error) {
      console.error('选择头像失败:', error);
      Toast.show({
        type: 'error',
        text1: '选择头像失败',
        text2: '请稍后重试',
      });
    }
  };

  // 打开编辑信息弹窗
  const handleOpenEditModal = () => {
    setUsername(user?.username || '');
    setEmail(user?.email || '');
    setPhone(user?.phone || '');
    setEditModalVisible(true);
  };

  // 处理更新用户信息
  const handleUpdateUserInfo = async () => {
    if (!user) return;

    const updateData: UpdateUserInfoRequest = {
      username,
      email,
      phone,
    };

    updateUserInfo(updateData, {
      onSuccess: () => {
        setEditModalVisible(false);
      },
    });
  };

  // 处理修改密码
  const handleChangePassword = () => {
    if (!oldPassword || !newPassword || !confirmPassword) {
      Toast.show({
        type: 'error',
        text1: '请填写完整',
        text2: '所有字段都是必填的',
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      Toast.show({
        type: 'error',
        text1: '密码不匹配',
        text2: '新密码和确认密码不一致',
      });
      return;
    }

    if (newPassword.length < 6) {
      Toast.show({
        type: 'error',
        text1: '密码过短',
        text2: '新密码长度不能少于6位',
      });
      return;
    }

    const data: ChangePasswordRequest = {
      old_password: oldPassword,
      new_password: newPassword,
      confirm_password: confirmPassword,
    };

    changePassword(data, {
      onSuccess: () => {
        setPasswordModalVisible(false);
        setOldPassword('');
        setNewPassword('');
        setConfirmPassword('');

        // 直接清除用户认证数据并跳转到登录页面
        // 不使用setTimeout，避免时序问题
        clearAuthData().then(() => {
          // 清除React Query缓存
          queryClient.clear();
          // 直接跳转到登录页
          router.replace({
            pathname: '/(auth)/login',
            // 添加参数表明是密码修改后的跳转
            params: { fromPasswordChange: 'true' },
          });
        });
      },
    });
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <Text>加载中...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>个人中心</Text>
        <View style={styles.userRoleContainer}>
          <Text style={styles.userRoleTag}>{getUserTypeLabel(user?.user_type)}</Text>
        </View>
      </View>

      {/* 用户资料卡片 */}
      <View style={styles.userCard}>
        <TouchableOpacity
          style={styles.avatarContainer}
          onPress={handleAvatarChange}
          disabled={isUploading}
        >
          {isUploading ? (
            <View style={[styles.avatar, styles.avatarLoading]}>
              <ActivityIndicator color="#007aff" size="small" />
            </View>
          ) : (
            <>
              <Image
                source={
                  user?.avatar
                    ? {
                        uri:
                          typeof Constants.expoConfig?.extra?.apiUrl === 'string'
                            ? Constants.expoConfig.extra.apiUrl.split('/api')[0] + user.avatar
                            : user.avatar,
                      }
                    : require('../../assets/images/OIP.jpg')
                }
                style={styles.avatar}
              />
              <View style={styles.avatarEditIcon}>
                <MaterialIcons name="photo-camera" size={18} color="#fff" />
              </View>
            </>
          )}
        </TouchableOpacity>
        <View style={styles.userInfo}>
          <Text style={styles.username}>{user?.username || '用户'}</Text>
          <View style={styles.userTypeContainer}>
            <Text style={styles.userType}>{getUserTypeLabel(user?.user_type)}</Text>
          </View>
          <Text style={styles.phone}>{user?.phone || '未设置手机号'}</Text>
          <Text style={styles.email}>{user?.email || '未设置邮箱'}</Text>
        </View>
      </View>

      {/* 功能菜单 */}
      <View style={styles.menuSection}>
        <Text style={styles.sectionTitle}>账户管理</Text>

        <TouchableOpacity style={styles.menuItem} onPress={handleOpenEditModal}>
          <MaterialIcons name="person" size={24} color="#555" />
          <Text style={styles.menuText}>修改个人资料</Text>
          <MaterialIcons name="chevron-right" size={24} color="#ccc" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuItem} onPress={() => setPasswordModalVisible(true)}>
          <MaterialIcons name="security" size={24} color="#555" />
          <Text style={styles.menuText}>修改密码</Text>
          <MaterialIcons name="chevron-right" size={24} color="#ccc" />
        </TouchableOpacity>
      </View>

      <View style={styles.menuSection}>
        <Text style={styles.sectionTitle}>系统设置</Text>

        <TouchableOpacity style={styles.menuItem} onPress={() => setHelpModalVisible(true)}>
          <MaterialIcons name="help" size={24} color="#555" />
          <Text style={styles.menuText}>帮助中心</Text>
          <MaterialIcons name="chevron-right" size={24} color="#ccc" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuItem} onPress={() => setAboutModalVisible(true)}>
          <MaterialIcons name="info" size={24} color="#555" />
          <Text style={styles.menuText}>关于我们</Text>
          <MaterialIcons name="chevron-right" size={24} color="#ccc" />
        </TouchableOpacity>
      </View>

      {/* 退出登录按钮 */}
      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Text style={styles.logoutText}> 退出登录</Text>
      </TouchableOpacity>

      {/* 编辑个人信息弹窗 */}
      <Modal visible={editModalVisible} transparent={true} animationType="slide">
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>修改个人信息</Text>
              <TouchableOpacity onPress={() => setEditModalVisible(false)}>
                <MaterialIcons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>用户名</Text>
              <TextInput
                style={styles.input}
                value={username}
                onChangeText={setUsername}
                placeholder="请输入用户名"
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>邮箱</Text>
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                placeholder="请输入邮箱（选填）"
                keyboardType="email-address"
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>手机号</Text>
              <TextInput
                style={styles.input}
                value={phone}
                onChangeText={setPhone}
                placeholder="请输入手机号"
                keyboardType="phone-pad"
              />
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setEditModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>取消</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.saveButton]}
                onPress={handleUpdateUserInfo}
                disabled={updateLoading}
              >
                {updateLoading ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.saveButtonText}>保存</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* 帮助中心弹窗 */}
      <Modal visible={helpModalVisible} transparent={true} animationType="slide">
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>帮助中心</Text>
              <TouchableOpacity onPress={() => setHelpModalVisible(false)}>
                <MaterialIcons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.helpContent}>
              <View style={styles.helpSection}>
                <Text style={styles.helpTitle}>1. 如何使用库存管理系统？</Text>
                <Text style={styles.helpText}>
                  本系统提供了全面的库存管理功能，包括商品入库、出库、库存查询、库存预警等。您可以通过导航栏访问各个功能模块。
                </Text>
              </View>

              <View style={styles.helpSection}>
                <Text style={styles.helpTitle}>2. 如何查询库存？</Text>
                <Text style={styles.helpText}>
                  在首页点击"库存查询"功能，输入商品名称或编号即可快速查询商品的库存情况。系统支持模糊查询和高级筛选。
                </Text>
              </View>

              <View style={styles.helpSection}>
                <Text style={styles.helpTitle}>3. 如何处理库存预警？</Text>
                <Text style={styles.helpText}>
                  系统会自动监控库存水平，当某商品库存低于预设阈值时，会在"库存预警"页面显示提醒。您可以及时采取补货措施。
                </Text>
              </View>

              <View style={styles.helpSection}>
                <Text style={styles.helpTitle}>4. 如何修改个人信息？</Text>
                <Text style={styles.helpText}>
                  在个人中心页面，点击"修改个人资料"，可以更新您的用户名、邮箱和手机号等信息。
                </Text>
              </View>

              <View style={styles.helpSection}>
                <Text style={styles.helpTitle}>5. 忘记密码怎么办？</Text>
                <Text style={styles.helpText}>
                  如果您忘记了密码，请联系系统管理员重置密码。出于安全考虑，系统不提供自助密码重置功能。
                </Text>
              </View>
            </ScrollView>

            <TouchableOpacity style={styles.closeButton} onPress={() => setHelpModalVisible(false)}>
              <Text style={styles.closeButtonText}>关闭</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* 关于我们弹窗 */}
      <Modal visible={aboutModalVisible} transparent={true} animationType="slide">
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>关于我们</Text>
              <TouchableOpacity onPress={() => setAboutModalVisible(false)}>
                <MaterialIcons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.aboutContent}>
              <View style={styles.aboutSection}>
                <Text style={styles.aboutSubtitle}>企业简介</Text>
                <Text style={styles.aboutText}>
                  智能库存管理系统是由科技股份有限公司开发的专业库存管理解决方案。我们致力于为企业提供高效、精准的库存管理工具，帮助企业降低库存成本，提高运营效率。
                </Text>
              </View>

              <View style={styles.aboutSection}>
                <Text style={styles.aboutSubtitle}>产品优势</Text>
                <Text style={styles.aboutText}>
                  • 实时库存监控{'\n'}• 智能库存预警{'\n'}• 多维度数据分析
                  {'\n'}• 完善的日志记录{'\n'}• 多平台支持
                </Text>
              </View>
            </ScrollView>

            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setAboutModalVisible(false)}
            >
              <Text style={styles.closeButtonText}>关闭</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* 修改密码弹窗 */}
      <Modal visible={passwordModalVisible} transparent={true} animationType="slide">
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>修改密码</Text>
              <TouchableOpacity
                onPress={() => {
                  setPasswordModalVisible(false);
                  setOldPassword('');
                  setNewPassword('');
                  setConfirmPassword('');
                }}
              >
                <MaterialIcons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>旧密码</Text>
              <TextInput
                style={styles.input}
                value={oldPassword}
                onChangeText={setOldPassword}
                placeholder="请输入当前密码"
                secureTextEntry={true}
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>新密码</Text>
              <TextInput
                style={styles.input}
                value={newPassword}
                onChangeText={setNewPassword}
                placeholder="请输入新密码（至少6位）"
                secureTextEntry={true}
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>确认新密码</Text>
              <TextInput
                style={styles.input}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder="请再次输入新密码"
                secureTextEntry={true}
              />
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setPasswordModalVisible(false);
                  setOldPassword('');
                  setNewPassword('');
                  setConfirmPassword('');
                }}
              >
                <Text style={styles.cancelButtonText}>取消</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.saveButton]}
                onPress={handleChangePassword}
                disabled={passwordLoading}
              >
                {passwordLoading ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.saveButtonText}>确认修改</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 20,
    backgroundColor: '#ffffff',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
  },
  userRoleContainer: {
    backgroundColor: '#007aff',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 15,
  },
  userRoleTag: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#ffffff',
    marginBottom: 15,
  },
  avatarContainer: {
    position: 'relative',
  },
  avatar: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#e0e0e0',
  },
  avatarLoading: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarEditIcon: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    backgroundColor: '#007aff',
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  userInfo: {
    marginLeft: 20,
    flex: 1,
  },
  username: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 5,
    color: '#333',
  },
  userTypeContainer: {
    backgroundColor: '#f0f7ff',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    marginBottom: 6,
  },
  userType: {
    color: '#007aff',
    fontSize: 12,
    fontWeight: '500',
  },
  phone: {
    fontSize: 14,
    color: '#666',
    marginBottom: 3,
  },
  email: {
    fontSize: 14,
    color: '#666',
  },
  menuSection: {
    backgroundColor: '#ffffff',
    marginBottom: 15,
    paddingVertical: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderBottomWidth: 0.5,
    borderBottomColor: '#eee',
  },
  menuText: {
    flex: 1,
    marginLeft: 15,
    fontSize: 16,
    color: '#333',
  },
  logoutButton: {
    margin: 20,
    backgroundColor: '#ff3b30',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 50,
  },
  logoutText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  // 添加弹窗样式
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    paddingHorizontal: 20,
  },
  modalContent: {
    width: '100%',
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  inputContainer: {
    marginBottom: 15,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 5,
    paddingHorizontal: 15,
    paddingVertical: 10,
    fontSize: 16,
    backgroundColor: '#fafafa',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 20,
  },
  modalButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 5,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 100,
  },
  cancelButton: {
    backgroundColor: '#f5f5f5',
    marginRight: 10,
  },
  saveButton: {
    backgroundColor: '#007aff',
  },
  cancelButtonText: {
    color: '#333',
    fontSize: 16,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
  },
  // 帮助中心样式
  helpContent: {
    maxHeight: 400,
  },
  helpSection: {
    marginBottom: 20,
  },
  helpTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  helpText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },

  // 关于我们样式
  aboutContent: {
    maxHeight: 400,
  },
  aboutSection: {
    marginBottom: 20,
  },
  aboutSubtitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  aboutText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },

  // 通用按钮样式
  closeButton: {
    backgroundColor: '#007aff',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 5,
    alignItems: 'center',
    marginTop: 15,
  },
  closeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
});
