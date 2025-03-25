import { Picker } from '@react-native-picker/picker';
import * as ImagePicker from 'expo-image-picker';
import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useAddDog, useIdentifyBreed } from '../../http/useDogs';
import Toast from 'react-native-toast-message';

// 预定义的狗狗品种列表
const breedOptions = [
  '中华田园犬',
  '雪纳瑞',
  '藏獒',
  '边牧',
  '博美',
  '柴犬',
  '德牧',
  '哈士奇',
  '金毛犬',
  '柯基',
  '拉布拉多',
  '萨摩耶',
];

export default function Pets() {
  // 表单状态
  const [name, setName] = useState('');
  const [breed, setBreed] = useState('');
  const [height, setHeight] = useState('');
  const [weight, setWeight] = useState('');
  const [image, setImage] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<any>(null);
  const [identifying, setIdentifying] = useState(false);
  // 识别结果信息
  const [identifiedBreedInfo, setIdentifiedBreedInfo] = useState<{
    breed: string;
    confidence: number;
  } | null>(null);

  // 获取狗狗列表
  // const { data: dogs, isLoading: loadingDogs } = useDogs();

  // 添加狗狗
  const addDogMutation = useAddDog();

  // 品种识别
  const identifyBreedMutation = useIdentifyBreed();

  // 选择图片
  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (status !== 'granted') {
      Toast.show({
        type: 'error',
        text1: '权限错误',
        text2: '需要访问照片库的权限才能选择图片',
      });
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 1,
    });

    if (!result.canceled) {
      const selectedAsset = result.assets[0];
      setImage(selectedAsset.uri);

      // 创建文件对象以便上传，并确保有.jpg扩展名
      // 提取基本文件名，不带路径
      let baseFileName = selectedAsset.uri.split('/').pop() || 'image';
      // 移除可能存在的扩展名
      baseFileName = baseFileName.split('.')[0];
      // 添加.jpg扩展名
      const fileName = `${baseFileName}.jpg`;

      const fileType = 'image/jpeg';

      setImageFile({
        uri: selectedAsset.uri,
        name: fileName,
        type: fileType,
      });

      // 自动识别品种
      if (selectedAsset.uri) {
        identifyBreed(selectedAsset.uri, fileName, fileType);
      }
    }
  };

  // 拍照
  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();

    if (status !== 'granted') {
      Toast.show({
        type: 'error',
        text1: '权限错误',
        text2: '需要访问相机的权限才能拍照',
      });
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [4, 3],
      quality: 1,
    });

    if (!result.canceled) {
      const selectedAsset = result.assets[0];
      setImage(selectedAsset.uri);

      // 创建文件对象以便上传，并确保有.jpg扩展名
      // 提取基本文件名，不带路径
      let baseFileName = selectedAsset.uri.split('/').pop() || 'image';
      // 移除可能存在的扩展名
      baseFileName = baseFileName.split('.')[0];
      // 添加.jpg扩展名
      const fileName = `${baseFileName}.jpg`;

      const fileType = 'image/jpeg';

      setImageFile({
        uri: selectedAsset.uri,
        name: fileName,
        type: fileType,
      });

      // 自动识别品种
      if (selectedAsset.uri) {
        identifyBreed(selectedAsset.uri, fileName, fileType);
      }
    }
  };

  // 识别品种
  const identifyBreed = async (uri: string, name: string, type: string) => {
    try {
      setIdentifying(true);
      console.log('开始识别品种，URI:', uri.substring(0, 50) + '...');

      // 确保文件名有.jpg扩展名
      const fileName = 'image.jpg'; // 使用固定的文件名和扩展名

      // 创建FormData对象
      const formData = new FormData();

      // 为不同平台适配文件对象
      if (Platform.OS === 'web') {
        // Web平台处理
        if (uri.startsWith('data:') || uri.startsWith('blob:')) {
          try {
            // 尝试获取文件对象
            const response = await fetch(uri);
            const blob = await response.blob();
            formData.append('image', blob, fileName);
            console.log('Web平台: 成功将图片转换为Blob，文件名:', fileName);
          } catch (e) {
            console.error('Web平台图片处理错误:', e);
            Toast.show({
              type: 'error',
              text1: '上传错误',
              text2: '图片处理失败',
            });
            setIdentifying(false);
            return;
          }
        } else {
          // 如果是input file对象
          const fileField = document.querySelector('input[type="file"]');
          if (
            fileField &&
            (fileField as HTMLInputElement).files &&
            (fileField as HTMLInputElement).files!.length > 0
          ) {
            const file = (fileField as HTMLInputElement).files![0];
            formData.append('image', file);
            console.log('Web平台: 使用input file，文件名:', file.name);
          } else {
            // 退回到原始方法
            formData.append('image', {
              uri,
              name: fileName,
              type: 'image/jpeg',
            } as any);
            console.log('Web平台: 使用自定义文件对象，文件名:', fileName);
          }
        }
      } else {
        // React Native移动端
        const file = {
          uri: Platform.OS === 'android' ? uri : uri.replace('file://', ''),
          name: fileName,
          type: 'image/jpeg',
        };
        formData.append('image', file as any);
        console.log('移动端: 使用RN文件对象，文件名:', fileName);
      }

      // 打印FormData内容
      if (Platform.OS === 'web') {
        for (const pair of formData.entries()) {
          console.log(`FormData内容: ${pair[0]}, 类型: ${typeof pair[1]}`);
        }
      }

      const result = await identifyBreedMutation.mutateAsync(formData);

      if (result && result.breed) {
        // 保存识别结果信息
        setIdentifiedBreedInfo({
          breed: result.breed,
          confidence: result.confidence,
        });

        // 检查识别的品种是否在预设的品种集合中
        if (breedOptions.includes(result.breed)) {
          setBreed(result.breed);
        } else {
          // 如果识别的品种不在集合中，提示用户但不设置
          Toast.show({
            type: 'info',
            text1: '品种识别',
            text2: `识别到的品种"${result.breed}"不在预设列表中\n置信度: ${(
              result.confidence * 100
            ).toFixed(1)}%\n请从列表中选择最接近的品种`,
            visibilityTime: 4000,
          });
        }
      }
    } catch (error: any) {
      console.error('识别失败');
      Toast.show({
        type: 'error',
        text1: '识别失败',
        text2: '无法识别狗狗品种，请手动选择',
      });
    } finally {
      setIdentifying(false);
    }
  };

  // 提交表单
  const handleSubmit = async () => {
    // 检查必填字段
    if (!name || !breed || !height || !weight) {
      Toast.show({
        type: 'warning',
        text1: '表单不完整',
        text2: '请填写所有必填字段',
      });
      return;
    }

    // 验证高度和体重是有效数字
    const heightNum = parseFloat(height);
    const weightNum = parseFloat(weight);

    if (isNaN(heightNum) || heightNum <= 0) {
      Toast.show({
        type: 'warning',
        text1: '无效输入',
        text2: '请输入有效的身高数值',
      });
      return;
    }

    if (isNaN(weightNum) || weightNum <= 0) {
      Toast.show({
        type: 'warning',
        text1: '无效输入',
        text2: '请输入有效的体重数值',
      });
      return;
    }

    try {
      const formData = new FormData();
      formData.append('name', name);
      formData.append('breed', breed);

      // 将数值转换为字符串，但确保是数字格式
      formData.append('height', heightNum.toString());
      formData.append('weight', weightNum.toString());

      if (imageFile) {
        // 使用固定的文件名和MIME类型
        const fileName = 'dog_image.jpg';

        if (Platform.OS === 'web') {
          // Web平台处理
          if (imageFile.uri && imageFile.uri.startsWith('data:')) {
            // base64格式的图片数据
            const response = await fetch(imageFile.uri);
            const blob = await response.blob();
            formData.append('image', blob, fileName);
            console.log('添加狗狗: 使用Blob，文件名:', fileName);
          } else {
            // 文件对象
            if (
              typeof imageFile === 'object' &&
              !(imageFile instanceof Blob) &&
              !imageFile.name
            ) {
              // 如果是自定义对象且没有名称，添加名称
              imageFile.name = fileName;
            }
            formData.append('image', imageFile as any);
            console.log(
              '添加狗狗: 使用文件对象，文件名:',
              imageFile.name || fileName
            );
          }
        } else {
          // React Native移动端
          formData.append('image', {
            uri:
              Platform.OS === 'android'
                ? imageFile.uri
                : imageFile.uri.replace('file://', ''),
            name: fileName,
            type: 'image/jpeg',
          } as any);
          console.log('添加狗狗: 使用RN文件对象，文件名:', fileName);
        }
      }

      await addDogMutation.mutateAsync(formData);

      // 重置表单
      setName('');
      setBreed('');
      setHeight('');
      setWeight('');
      setImage(null);
      setImageFile(null);
      setIdentifiedBreedInfo(null);
    } catch (error) {
      console.error('提交失败:', error);
    }
  };

  // 渲染选择器
  const renderPicker = () => {
    if (Platform.OS === 'web') {
      return (
        <select
          value={breed}
          onChange={(e) => setBreed(e.target.value)}
          style={{
            width: '100%',
            padding: 12,
            fontSize: 16,
            borderRadius: 8,
            borderWidth: 1,
            borderColor: '#DDD',
            backgroundColor: 'white',
            color: breed ? '#000' : '#A0A0A0',
          }}
          disabled={identifying}
        >
          <option value=''>请选择品种</option>
          {breedOptions.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      );
    }

    // 对于Android和iOS，使用Picker组件
    return (
      <>
        <Picker
          selectedValue={breed}
          onValueChange={(itemValue) => {
            setBreed(itemValue);
          }}
          style={styles.picker}
        >
          <Picker.Item label='请选择品种' value='' />
          {breedOptions.map((option) => (
            <Picker.Item key={option} label={option} value={option} />
          ))}
        </Picker>
      </>
    );
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>添加狗狗</Text>

      {/* 图片上传 */}
      <View style={styles.imageContainer}>
        {image ? (
          <Image source={{ uri: image }} style={styles.image} />
        ) : (
          <View style={styles.imagePlaceholder}>
            <Text style={styles.imagePlaceholderText}>选择图片</Text>
          </View>
        )}
        <View style={styles.imageButtons}>
          <TouchableOpacity
            style={styles.button}
            onPress={pickImage}
            disabled={identifying || addDogMutation.isPending}
          >
            <Text style={styles.buttonText}>从相册选择</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.button}
            onPress={takePhoto}
            disabled={identifying || addDogMutation.isPending}
          >
            <Text style={styles.buttonText}>拍照</Text>
          </TouchableOpacity>
        </View>

        {/* 显示识别结果信息 */}
        {identifiedBreedInfo && (
          <View style={styles.identifiedInfo}>
            <Text style={styles.identifiedText}>
              识别结果: {identifiedBreedInfo.breed}
              (置信度: {(identifiedBreedInfo.confidence * 100).toFixed(1)}%)
            </Text>
          </View>
        )}
      </View>

      {/* 表单字段 */}
      <View style={styles.formGroup}>
        <Text style={styles.label}>名字</Text>
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          placeholder='请输入狗狗名字'
          placeholderTextColor='#A0A0A0'
        />
      </View>

      <View style={styles.formGroup}>
        <Text style={styles.label}>品种</Text>
        <View style={styles.breedInputContainer}>
          {identifying && (
            <ActivityIndicator
              size='small'
              color='#0066CC'
              style={{ marginRight: 10 }}
            />
          )}
          <View style={styles.pickerContainer}>{renderPicker()}</View>
        </View>
      </View>

      <View style={styles.formGroup}>
        <Text style={styles.label}>身高 (cm)</Text>
        <TextInput
          style={styles.input}
          value={height}
          onChangeText={setHeight}
          placeholder='请输入狗狗身高'
          placeholderTextColor='#A0A0A0'
          keyboardType='numeric'
        />
      </View>

      <View style={styles.formGroup}>
        <Text style={styles.label}>体重 (kg)</Text>
        <TextInput
          style={styles.input}
          value={weight}
          onChangeText={setWeight}
          placeholder='请输入狗狗体重'
          placeholderTextColor='#A0A0A0'
          keyboardType='numeric'
        />
      </View>

      {/* 提交按钮 */}
      <TouchableOpacity
        style={[
          styles.submitButton,
          (addDogMutation.isPending || identifying) && styles.disabledButton,
        ]}
        onPress={handleSubmit}
        disabled={addDogMutation.isPending || identifying}
      >
        {addDogMutation.isPending ? (
          <ActivityIndicator color='#FFFFFF' />
        ) : (
          <Text style={styles.submitButtonText}>保存</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#F8F8F8',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 24,
    color: '#333',
    textAlign: 'center',
  },
  imageContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  image: {
    width: 200,
    height: 200,
    borderRadius: 10,
    marginBottom: 12,
  },
  imagePlaceholder: {
    width: 200,
    height: 200,
    borderRadius: 10,
    backgroundColor: '#E1E1E1',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  imagePlaceholderText: {
    color: '#888',
    fontSize: 16,
  },
  imageButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  button: {
    backgroundColor: '#5A9BD5',
    padding: 10,
    borderRadius: 8,
    flex: 0.48,
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontWeight: '500',
  },
  formGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    marginBottom: 8,
    color: '#555',
    fontWeight: '500',
  },
  input: {
    backgroundColor: 'white',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#DDD',
    fontSize: 16,
  },
  submitButton: {
    backgroundColor: '#4CAF50',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 32,
  },
  disabledButton: {
    backgroundColor: '#A5D6A7',
  },
  submitButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 18,
  },
  pickerContainer: {
    flex: 1,
    backgroundColor: 'white',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#DDD',
    overflow: 'hidden',
  },
  pickerButton: {
    width: '100%',
    height: 45,
    backgroundColor: 'transparent',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  breedInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  identifiedInfo: {
    marginTop: 10,
    padding: 10,
    backgroundColor: '#E8F5E9',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#C8E6C9',
    alignSelf: 'stretch',
  },
  identifiedText: {
    color: '#2E7D32',
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    paddingBottom: 20,
  },
  pickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
  },
  pickerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  pickerDoneButton: {
    fontSize: 16,
    color: '#4CAF50',
    fontWeight: 'bold',
  },
  picker: {
    width: '100%',
    height: 60,
  },
});
