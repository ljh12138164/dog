import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import Constants from 'expo-constants';
import * as ImagePicker from 'expo-image-picker';
import React from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Toast from 'react-native-toast-message';
import { useCurrentUser, logout, useUploadAvatar, clearAuthData } from '../../api/useAuth';
import { useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';

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

  // 上传头像hook
  const { mutate: uploadAvatar, isPending: isUploading } = useUploadAvatar(Toast);

  const handleLogout = async () => {
    await clearAuthData();
    queryClient.invalidateQueries({ queryKey: ['user'] });
    Toast.show({
      type: 'succees',
      text1: '退出登录成功',
    });
    router.replace('/(auth)/login');
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

        <TouchableOpacity style={styles.menuItem}>
          <MaterialIcons name="person" size={24} color="#555" />
          <Text style={styles.menuText}>个人资料</Text>
          <MaterialIcons name="chevron-right" size={24} color="#ccc" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuItem}>
          <MaterialIcons name="security" size={24} color="#555" />
          <Text style={styles.menuText}>账号安全</Text>
          <MaterialIcons name="chevron-right" size={24} color="#ccc" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuItem}>
          <MaterialIcons name="notifications" size={24} color="#555" />
          <Text style={styles.menuText}>消息通知</Text>
          <MaterialIcons name="chevron-right" size={24} color="#ccc" />
        </TouchableOpacity>
      </View>

      <View style={styles.menuSection}>
        <Text style={styles.sectionTitle}>系统设置</Text>

        <TouchableOpacity style={styles.menuItem}>
          <MaterialIcons name="settings" size={24} color="#555" />
          <Text style={styles.menuText}>通用设置</Text>
          <MaterialIcons name="chevron-right" size={24} color="#ccc" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuItem}>
          <MaterialIcons name="help" size={24} color="#555" />
          <Text style={styles.menuText}>帮助中心</Text>
          <MaterialIcons name="chevron-right" size={24} color="#ccc" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuItem}>
          <MaterialIcons name="info" size={24} color="#555" />
          <Text style={styles.menuText}>关于我们</Text>
          <MaterialIcons name="chevron-right" size={24} color="#ccc" />
        </TouchableOpacity>
      </View>

      {/* 退出登录按钮 */}
      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Text style={styles.logoutText}> 退出登录</Text>
      </TouchableOpacity>
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
});
