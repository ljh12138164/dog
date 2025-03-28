import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import * as ImagePicker from 'expo-image-picker';
import { Stack, router } from 'expo-router';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import LogoutConfirmModal from '@/components/LogoutConfirmModal';
import { useCurrentUser, useLogout, useUploadAvatar } from '../../http/useAuth';
import Toast from 'react-native-toast-message';
import { ShowToast } from '../_layout';

export default function UserProfile() {
  const { data: user, isLoading, error, refetch } = useCurrentUser();
  const logout = useLogout();
  const avatarUpload = useUploadAvatar();
  const [uploadProgress] = useState(0);
  const [logoutModalVisible, setLogoutModalVisible] = useState(false);

  const handleLogout = () => {
    setLogoutModalVisible(true);
  };

  const confirmLogout = () => {
    setLogoutModalVisible(false);
    logout.mutate(undefined, {
      onSuccess: () => {
        // 退出登录后重定向到登录页
        router.replace('/login');
        Alert.alert('已成功退出登录');
      },
    });
  };

  const cancelLogout = () => {
    setLogoutModalVisible(false);
  };

  const pickImage = async () => {
    // 请求权限
    const { status: cameraRollStatus } =
      await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (cameraRollStatus !== 'granted') {
      Alert.alert('权限请求', '需要访问您的相册才能选择图片');
      return;
    }

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const selectedAsset = result.assets[0];

        // 获取文件名和类型
        const uri = selectedAsset.uri;
        const fileNameMatch = uri.match(/[^\/]+$/);
        const fileName = fileNameMatch
          ? fileNameMatch[0]
          : `avatar_${Date.now()}.jpg`;
        const fileType = selectedAsset.mimeType || 'image/jpeg';

        // 上传图片
        avatarUpload.mutate({
          uri,
          type: fileType,
          name: fileName,
        });
      }
    } catch (error) {
      Alert.alert('错误', '选择图片时出错，请重试');
    }
  };

  const takePhoto = async () => {
    // 请求相机权限
    const { status: cameraStatus } =
      await ImagePicker.requestCameraPermissionsAsync();

    if (cameraStatus !== 'granted') {
      Alert.alert('权限请求', '需要访问您的相机才能拍照');
      return;
    }

    try {
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const selectedAsset = result.assets[0];

        // 获取文件名和类型
        const uri = selectedAsset.uri;
        const fileNameMatch = uri.match(/[^\/]+$/);
        const fileName = fileNameMatch
          ? fileNameMatch[0]
          : `avatar_${Date.now()}.jpg`;
        const fileType = selectedAsset.mimeType || 'image/jpeg';

        // 上传图片
        avatarUpload.mutate({
          uri,
          type: fileType,
          name: fileName,
        });
      }
    } catch (error) {
      Alert.alert('错误', '拍照时出错，请重试');
    }
  };

  const handleAvatarPress = () => {
    Alert.alert('更换头像', '请选择头像来源', [
      {
        text: '从相册选择',
        onPress: () => pickImage(),
      },
      {
        text: '拍照',
        onPress: () => takePhoto(),
      },
      {
        text: '取消',
        style: 'cancel',
      },
    ]);
  };

  // 如果正在加载，显示加载指示器
  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size='large' color='#0000ff' />
      </View>
    );
  }

  // 处理错误状态
  if (error || !user) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>获取用户信息失败</Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => refetch()}>
          <Text style={styles.retryButtonText}>重试</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <>
      <ScrollView style={styles.container}>
        <Stack.Screen
          options={{
            title: '个人资料',
            headerShown: true,
          }}
        />

        <View style={styles.header}>
          <TouchableOpacity
            style={styles.avatarContainer}
            onPress={handleAvatarPress}
            disabled={avatarUpload.isPending}
          >
            {avatarUpload.isPending ? (
              <View style={styles.uploadingContainer}>
                <ActivityIndicator size='small' color='#fff' />
                <Text style={styles.uploadingText}>{uploadProgress}%</Text>
              </View>
            ) : (
              <>
                <Image
                  source={{
                    uri: user.avatar
                      ? user.avatar
                      : `https://ui-avatars.com/api/?name=${user.full_name || user.username}&background=random`,
                  }}
                  style={styles.avatar}
                />
                <View style={styles.editIconContainer}>
                  <MaterialIcons name='edit' size={16} color='#fff' />
                </View>
              </>
            )}
          </TouchableOpacity>
          <Text style={styles.username}>{user.full_name || user.username}</Text>
          <Text style={styles.email}>{user.email}</Text>
        </View>

        <View style={styles.infoSection}>
          <Text
            style={styles.sectionTitle}
            onPress={() => {
              ShowToast('success', '账户信息');
            }}
          >
            账户信息
          </Text>

          <View style={styles.infoItem}>
            <MaterialIcons name='person' size={24} color='#555' />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>用户名</Text>
              <Text style={styles.infoValue}>{user.username}</Text>
            </View>
          </View>

          <View style={styles.infoItem}>
            <MaterialIcons name='email' size={24} color='#555' />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>邮箱</Text>
              <Text style={styles.infoValue}>{user.email}</Text>
            </View>
          </View>

          <View style={styles.infoItem}>
            <MaterialIcons name='date-range' size={24} color='#555' />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>注册时间</Text>
              <Text style={styles.infoValue}>{user.date_joined}</Text>
            </View>
          </View>

          <View style={styles.infoItem}>
            <MaterialIcons name='access-time' size={24} color='#555' />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>上次登录</Text>
              <Text style={styles.infoValue}>
                {user.last_login || '无记录'}
              </Text>
            </View>
          </View>
        </View>

        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <MaterialIcons name='logout' size={20} color='#fff' />
          <Text style={styles.logoutButtonText}>退出登录</Text>
        </TouchableOpacity>
        <LogoutConfirmModal
          visible={logoutModalVisible}
          onConfirm={confirmLogout}
          onCancel={cancelLogout}
        />
      </ScrollView>
      <Toast />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9f9f9',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#ff3b30',
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#007aff',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  header: {
    backgroundColor: '#fff',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  avatarContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    overflow: 'hidden',
    marginBottom: 15,
    borderWidth: 3,
    borderColor: '#e0e0e0',
    position: 'relative',
  },
  avatar: {
    width: '100%',
    height: '100%',
  },
  editIconContainer: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },
  uploadingContainer: {
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  uploadingText: {
    color: '#fff',
    marginTop: 5,
    fontSize: 12,
  },
  username: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  email: {
    fontSize: 16,
    color: '#666',
  },
  infoSection: {
    backgroundColor: '#fff',
    marginTop: 15,
    marginBottom: 15,
    paddingVertical: 15,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#eee',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    paddingHorizontal: 15,
    marginBottom: 15,
  },
  infoItem: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    alignItems: 'center',
  },
  infoContent: {
    marginLeft: 15,
    flex: 1,
  },
  infoLabel: {
    fontSize: 14,
    color: '#888',
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 16,
  },
  logoutButton: {
    backgroundColor: '#ff3b30',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    margin: 15,
    padding: 15,
    borderRadius: 8,
    marginBottom: 30,
  },
  logoutButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
    marginLeft: 8,
  },
});
