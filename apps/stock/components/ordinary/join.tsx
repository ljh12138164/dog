import { useInventoryOperation, useShow } from '@/api/useEmployee';
import { format } from 'date-fns';
import { Camera, CameraView } from 'expo-camera';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Platform, ScrollView, StyleSheet, View } from 'react-native';
import {
  Button,
  Card,
  Chip,
  Dialog,
  Divider,
  Paragraph,
  Portal,
  Text,
  TextInput,
} from 'react-native-paper';
import Toast from 'react-native-toast-message';
import { useCreateInventoryOperation, useInventoryOperations } from '../../api/useInventory';
import { useMaterialRequestManagement } from '../../api/useOrdinary';
// 定义二维码中可能包含的数据类型
interface QRCodeData {
  id?: number; // 食材ID/序号
  unit: number;
  name?: string; // 食材名称
  quantity?: number; // 数量
  // production_date?: string; // 生产日期
  expiry_date?: string; // 保质期
}

export default function Join() {
  const { requests, isLoadingRequests, handleCompleteMaterialRequest } =
    useMaterialRequestManagement();

  // 状态定义
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [scanned, setScanned] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [scannedData, setScannedData] = useState<string | null>(null);
  const [ingredient, setIngredient] = useState<any | null>(null);
  const [quantity, setQuantity] = useState('');
  const [notes, setNotes] = useState('');
  const [productionDate, setProductionDate] = useState('');
  const [expiryPeriod, setExpiryPeriod] = useState<string | undefined>(undefined);
  const [dialogVisible, setDialogVisible] = useState(false);
  const [confirmDialogVisible, setConfirmDialogVisible] = useState(false);
  const [scanHistory, setScanHistory] = useState<{ id: string; name: string; time: Date }[]>([]);

  // API 钩子
  const { data: ingredients = [] } = useInventoryOperations();
  const { mutateAsync: showCreate } = useShow(Toast);
  const createInventoryOperation = useCreateInventoryOperation(Toast);
  const { mutateAsync: performOperation } = useInventoryOperation(Toast);

  // 请求相机权限
  useEffect(() => {
    // 在Web平台上跳过权限请求
    if (Platform.OS === 'web') {
      setHasPermission(false);
      return;
    }

    (async () => {
      try {
        const { status } = await Camera.requestCameraPermissionsAsync();
        setHasPermission(status === 'granted');
      } catch (error) {
        console.error('获取相机权限失败:', error);
        setHasPermission(false);
      }
    })();
  }, []);

  // 扫描处理函数
  const handleBarCodeScanned = ({ type, data }: { type: string; data: string }) => {
    setScanned(true);
    setScannedData(data);

    try {
      // 解析二维码数据 - 假设格式是 JSON 字符串
      console.log(data);
      const parsedData: QRCodeData = JSON.parse(data);
      // 查找对应的食材
      const foundIngredient = ingredients.find(
        item => item.id === parsedData.id || item.name === parsedData.name,
      );

      if (foundIngredient) {
        setIngredient(foundIngredient);

        // 设置数量（如果二维码中提供）
        if (parsedData.quantity) {
          setQuantity(parsedData.quantity.toString());
        }

        // 设置生产日期（如果二维码中提供）
        // if (parsedData.production_date) {
        //   setProductionDate(parsedData.production_date);
        // }

        // 设置保质期（如果二维码中提供）
        if (parsedData.expiry_date) {
          setExpiryPeriod(parsedData.expiry_date);
        }
        // 记录扫描历史
        setScanHistory(prev => [
          {
            id: foundIngredient.id?.toString() || '',
            name: foundIngredient.name,
            time: new Date(),
          },
          ...prev.slice(0, 9), // 保留最近的10条记录
        ]);

        setDialogVisible(true);
      } else {
        Alert.alert('错误', '找不到对应的食材，请检查二维码是否正确');
      }
    } catch (error) {
      // 如果解析失败，尝试直接作为食材 ID 或名称查找
      const foundIngredient = ingredients.find(
        item => item?.id?.toString() === data || item.name === data,
      );

      if (foundIngredient) {
        setIngredient(foundIngredient);

        // 记录扫描历史
        setScanHistory(prev => [
          {
            id: foundIngredient.id?.toString() || '',
            name: foundIngredient.name,
            time: new Date(),
          },
          ...prev.slice(0, 9), // 保留最近的10条记录
        ]);
        setDialogVisible(true);
      } else {
        Alert.alert('错误', '无法识别的二维码内容，请确保二维码中包含有效的食材信息（序号或名称）');
      }
    }

    setShowScanner(false);
  };

  // 提交入库操作
  const submitInventoryOperation = async () => {
    if (!ingredient || !quantity || parseFloat(quantity) <= 0) {
      Alert.alert('错误', '请填写有效的数量');
      return;
    }
    try {
      // 执行入库操作 - 使用正确的库存操作接口格式
      await performOperation({
        ingredient: ingredient.id, // 食材ID
        operation_type: 'in', // 操作类型为入库
        quantity: parseFloat(quantity), // 数量
        expiry_period: expiryPeriod || '', // 保质期天数
        notes: notes || `扫码入库：${ingredient.name}`, // 备注信息
      });
      const time = format(ingredient.expiry_date, 'yyyy-MM-dd');

      // 创建商品 - 使用创建商品接口格式
      const data = await showCreate({
        name: ingredient.name,
        category: ingredient.category,
        unit: ingredient.unit,
        quantity: parseFloat(quantity),
        expiry_date: time,
        status: 'normal',
      });
      // 操作成功后显示提示
      Toast.show({
        type: 'success',
        text1: '入库成功',
        text2: `已成功入库 ${quantity} ${ingredient.unit} ${ingredient.name}`,
      });

      // 重置表单并关闭确认对话框
      resetForm();
      setConfirmDialogVisible(false);
    } catch (error) {
      console.error('入库操作失败:', error);
      Alert.alert('错误', '入库操作失败，请重试');
    }
  };

  // 关闭表单并重置
  const resetForm = () => {
    setScanned(false);
    setScannedData(null);
    setIngredient(null);
    setQuantity('');
    setNotes('');
    setProductionDate('');
    setExpiryPeriod('');
    setDialogVisible(false);
  };

  // 确认入库对话框
  const showConfirmDialog = () => {
    setDialogVisible(false);
    setConfirmDialogVisible(true);
  };

  // 处理扫描历史点击
  // const handleHistoryItemClick = (id: string) => {
  //   const foundIngredient = ingredients.find(item => item.id?.toString() === id);
  //   if (foundIngredient) {
  //     setIngredient(foundIngredient);
  //     setDialogVisible(true);
  //   }
  // };

  if (hasPermission === null) {
    return <Text>请求相机权限中...</Text>;
  }

  if (hasPermission === false && Platform.OS !== 'web') {
    return <Text>无法访问相机，请在设置中允许应用使用相机</Text>;
  }

  if (isLoadingRequests) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0088ff" />
        <Text style={styles.loadingText}>加载出库申请中...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <Card style={styles.card}>
        <Card.Title
          title="扫码入库"
          subtitle="扫描食材二维码进行入库操作"
          titleStyle={styles.cardTitle}
          subtitleStyle={styles.cardSubtitle}
        />
        <Card.Content>
          <Text style={styles.instruction}>
            点击下方按钮，扫描食材二维码，系统将自动识别食材信息并进行入库操作
          </Text>

          <Text style={styles.qrInstructionTitle}>二维码应包含以下信息：</Text>
          <View style={styles.qrInstructionItem}>
            <Text style={styles.qrInstructionBullet}>•</Text>
            <Text style={styles.qrInstructionText}>
              <Text style={styles.qrInstructionHighlight}>序号/ID</Text>（必须） - 食材的唯一标识符
            </Text>
          </View>
          <View style={styles.qrInstructionItem}>
            <Text style={styles.qrInstructionBullet}>•</Text>
            <Text style={styles.qrInstructionText}>
              <Text style={styles.qrInstructionHighlight}>名称</Text>（可选） - 食材名称
            </Text>
          </View>
          <View style={styles.qrInstructionItem}>
            <Text style={styles.qrInstructionBullet}>•</Text>
            <Text style={styles.qrInstructionText}>
              <Text style={styles.qrInstructionHighlight}>数量</Text>（可选） - 入库数量
            </Text>
          </View>
          {/* <View style={styles.qrInstructionItem}>
            <Text style={styles.qrInstructionBullet}>•</Text>
            <Text style={styles.qrInstructionText}>
              <Text style={styles.qrInstructionHighlight}>生产日期</Text>（可选） - 格式：YYYY-MM-DD
            </Text>
          </View> */}
          <View style={styles.qrInstructionItem}>
            <Text style={styles.qrInstructionBullet}>•</Text>
            <Text style={styles.qrInstructionText}>
              <Text style={styles.qrInstructionHighlight}>保质期</Text>（可选） - 天数或到期日期
            </Text>
          </View>

          <Text style={styles.qrFormatExample}>
            {`"name":"123"\n"category":"123"\n"unit":"123"\n"quantity":123\n"expiry_date":"2025-04-06T10:11:50.602Z"`}
          </Text>

          <Button
            mode="contained"
            onPress={() => {
              setScanned(false);
              setShowScanner(true);
            }}
            style={styles.scanButton}
            labelStyle={styles.buttonLabel}
            disabled={Platform.OS === 'web'}
          >
            开始扫描二维码
          </Button>
          {Platform.OS === 'web' && (
            <Text style={styles.webNotSupportedText}>
              Web平台暂不支持扫码功能，请使用移动设备。
            </Text>
          )}

          <Divider style={styles.divider} />

          {/* {scanHistory.length > 0 && (
            <>
              <Text style={styles.historyTitle}>最近扫描记录</Text>
              {scanHistory.map((item, index) => (
                <List.Item
                  key={`${item.id}-${index}`}
                  title={item.name}
                  description={`ID: ${item.id} - ${item.time.toLocaleTimeString()}`}
                  left={props => <List.Icon {...props} icon="history" color="#0088ff" />}
                  onPress={() => handleHistoryItemClick(item.id)}
                  style={styles.historyItem}
                  titleStyle={styles.historyItemTitle}
                  descriptionStyle={styles.historyItemDescription}
                />
              ))}
            </>
          )} */}
        </Card.Content>
      </Card>

      <Portal>
        <Dialog
          visible={showScanner}
          onDismiss={() => setShowScanner(false)}
          style={styles.scannerDialog}
        >
          <Dialog.Title style={styles.dialogTitle}>扫描二维码</Dialog.Title>
          <Dialog.Content>
            <View style={styles.scannerContainer}>
              {Platform.OS === 'web' ? (
                <Text style={styles.webNotSupportedText}>
                  Web平台暂不支持扫码功能，请使用移动设备。
                </Text>
              ) : (
                <CameraView
                  style={styles.scanner}
                  facing="back"
                  onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
                />
              )}
            </View>
            {scanned && Platform.OS !== 'web' && (
              <Button
                mode="contained"
                onPress={() => setScanned(false)}
                style={styles.rescanButton}
              >
                再次扫描
              </Button>
            )}
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setShowScanner(false)} textColor="#0088ff">
              取消
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      <Portal>
        <Dialog
          visible={dialogVisible}
          onDismiss={() => setDialogVisible(false)}
          style={styles.dialog}
        >
          <Dialog.Title style={styles.dialogTitle}>入库操作</Dialog.Title>
          <Dialog.Content>
            {ingredient && (
              <>
                <View style={styles.formRow}>
                  <Text style={styles.label}>序号/ID:</Text>
                  <Text style={styles.value}>{ingredient.id}</Text>
                </View>

                <View style={styles.formRow}>
                  <Text style={styles.label}>名称:</Text>
                  <View style={styles.valueContainer}>
                    <Text style={styles.value}>{ingredient.name}</Text>
                    <Chip style={styles.categoryChip}>
                      <Text style={styles.categoryText}>{ingredient.category}</Text>
                    </Chip>
                  </View>
                </View>

                <View style={styles.formRow}>
                  <Text style={styles.label}>当前库存:</Text>
                  <Text style={styles.value}>
                    {ingredient.quantity} {ingredient.unit}
                  </Text>
                </View>

                <TextInput
                  label="数量"
                  value={quantity}
                  onChangeText={setQuantity}
                  keyboardType="numeric"
                  mode="outlined"
                  style={styles.input}
                  outlineStyle={styles.inputOutline}
                  outlineColor="#0088ff"
                  activeOutlineColor="#0088ff"
                  textColor="#000000"
                />
                {/* 
                <TextInput
                  label="生产日期 (YYYY-MM-DD)"
                  value={productionDate}
                  onChangeText={setProductionDate}
                  mode="outlined"
                  placeholder="例如: 2023-01-01"
                  style={styles.input}
                  outlineStyle={styles.inputOutline}
                  outlineColor="#0088ff"
                  activeOutlineColor="#0088ff"
                  textColor="#000000"
                /> */}

                <TextInput
                  label="保质期 (天数)"
                  value={expiryPeriod}
                  onChangeText={setExpiryPeriod}
                  keyboardType="numeric"
                  placeholder="例如: 365"
                  mode="outlined"
                  style={styles.input}
                  outlineStyle={styles.inputOutline}
                  outlineColor="#0088ff"
                  activeOutlineColor="#0088ff"
                  textColor="#000000"
                />

                <TextInput
                  label="备注"
                  value={notes}
                  onChangeText={setNotes}
                  mode="outlined"
                  multiline
                  style={styles.input}
                  outlineStyle={styles.inputOutline}
                  outlineColor="#0088ff"
                  activeOutlineColor="#0088ff"
                  textColor="#000000"
                />
              </>
            )}
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setDialogVisible(false)} textColor="#0088ff">
              取消
            </Button>
            <Button onPress={showConfirmDialog} mode="contained" style={styles.confirmButton}>
              确认入库
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      <Portal>
        <Dialog
          visible={confirmDialogVisible}
          onDismiss={() => setConfirmDialogVisible(false)}
          style={styles.dialog}
        >
          <Dialog.Title style={styles.dialogTitle}>确认入库</Dialog.Title>
          <Dialog.Content>
            <Paragraph style={styles.dialogText}>
              您确定要将 {quantity} {ingredient?.unit} {ingredient?.name} 入库吗？
            </Paragraph>
            {/* {productionDate && (
              <Paragraph style={styles.dialogText}>生产日期: {productionDate}</Paragraph>
            )} */}
            {expiryPeriod && (
              <Paragraph style={styles.dialogText}>保质期: {expiryPeriod} 天</Paragraph>
            )}
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setConfirmDialogVisible(false)} textColor="#0088ff">
              取消
            </Button>
            <Button
              onPress={submitInventoryOperation}
              mode="contained"
              loading={createInventoryOperation.isPending}
              style={styles.confirmButton}
            >
              确认
            </Button>
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
    backgroundColor: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  loadingText: {
    marginTop: 10,
    color: '#000000',
  },
  card: {
    marginBottom: 16,
    backgroundColor: '#fff',
  },
  darkCard: {
    marginBottom: 16,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    elevation: 4,
    borderColor: '#0088ff',
    borderWidth: 1,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0088ff',
    marginBottom: 8,
    paddingHorizontal: 16,
  },
  cardSubtitle: {
    color: '#000000',
  },
  darkSegmentedButtons: {
    marginBottom: 20,
    backgroundColor: '#fff',
    borderColor: '#000000',
  },
  input: {
    marginBottom: 12,
  },
  darkInput: {
    marginBottom: 12,
    backgroundColor: '#fff',
    borderRadius: 8,
    borderColor: '#000000',
    borderWidth: 1,
  },
  button: {
    marginTop: 16,
  },
  darkButton: {
    marginTop: 16,
    backgroundColor: '#0088ff',
    borderRadius: 25,
    paddingVertical: 8,
  },
  submitButton: {
    backgroundColor: '#0088ff',
  },
  segmentedButtons: {
    marginBottom: 12,
  },
  subtitle: {
    color: '#000000',
    fontSize: 14,
    marginTop: -4,
    marginBottom: 10,
    paddingHorizontal: 16,
  },
  darkDivider: {
    height: 1,
    backgroundColor: '#0088ff',
    marginVertical: 8,
  },
  operationItem: {
    marginBottom: 4,
  },
  operationContent: {
    flex: 1,
  },
  operationTitle: {
    color: '#000000',
    fontSize: 16,
    fontWeight: 'bold',
  },
  operationDesc: {
    color: '#000000',
    fontSize: 14,
  },
  emptyText: {
    textAlign: 'center',
    marginVertical: 20,
    fontSize: 16,
    color: '#000000',
  },
  rightContent: {
    flexDirection: 'column',
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: 8,
  },
  statusChip: {
    backgroundColor: '#0088ff',
    marginTop: 5,
  },
  detailButton: {
    marginTop: 5,
    backgroundColor: '#0088ff',
    color: '#fff',
  },
  dialog: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#0088ff',
  },
  dialogTitle: {
    color: '#0088ff',
    fontWeight: 'bold',
    textAlign: 'center',
  },
  dialogContent: {
    marginBottom: 16,
    color: '#000000',
  },
  dialogActions: {
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  taskInfo: {
    backgroundColor: '#fff',
    padding: 10,
    borderRadius: 4,
    borderColor: '#0088ff',
    borderWidth: 1,
  },
  taskInfoItem: {
    marginBottom: 4,
    color: '#000000',
  },
  taskInfoLabel: {
    fontWeight: 'bold',
    color: '#000000',
  },
  itemsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#0088ff',
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  itemName: {
    color: '#000000',
    fontSize: 14,
  },
  itemQuantity: {
    color: '#000000',
    fontSize: 14,
  },
  filterContainer: {
    paddingHorizontal: 16,
    paddingBottom: 10,
  },
  instruction: {
    color: '#000000',
    fontSize: 16,
    marginBottom: 20,
    textAlign: 'center',
  },
  qrInstructionTitle: {
    color: '#000000',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  qrInstructionItem: {
    flexDirection: 'row',
    marginBottom: 6,
    paddingLeft: 10,
  },
  qrInstructionBullet: {
    color: '#0088ff',
    marginRight: 8,
    fontSize: 16,
  },
  qrInstructionText: {
    color: '#000000',
    fontSize: 14,
    flex: 1,
  },
  qrInstructionHighlight: {
    fontWeight: 'bold',
    color: '#0088ff',
  },
  qrFormatExample: {
    color: '#000000',
    fontSize: 12,
    backgroundColor: '#f0f0f0',
    padding: 10,
    borderRadius: 5,
    marginTop: 10,
    marginBottom: 20,
    fontFamily: 'monospace',
  },
  scanButton: {
    backgroundColor: '#0088ff',
    marginHorizontal: 50,
    marginVertical: 20,
    borderRadius: 8,
    paddingVertical: 8,
  },
  buttonLabel: {
    fontSize: 16,
    color: '#FFFFFF',
  },
  divider: {
    marginVertical: 20,
    backgroundColor: '#0088ff',
    height: 1,
  },
  historyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#000000',
  },
  historyItem: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    marginBottom: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#0088ff',
  },
  historyItemTitle: {
    color: '#000000',
    fontWeight: 'bold',
  },
  historyItemDescription: {
    color: '#000000',
  },
  scannerDialog: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
  },
  scannerContainer: {
    height: 300,
    overflow: 'hidden',
    borderRadius: 8,
    marginBottom: 16,
  },
  scanner: {
    height: 300,
    width: '100%',
  },
  rescanButton: {
    backgroundColor: '#0088ff',
    marginTop: 10,
  },
  dialogText: {
    color: '#000000',
    fontSize: 16,
  },
  formRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  label: {
    width: 80,
    fontWeight: 'bold',
    color: '#000000',
  },
  valueContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  value: {
    color: '#000000',
    fontSize: 16,
  },
  categoryChip: {
    backgroundColor: '#E3F2FD',
  },
  categoryText: {
    color: '#000000',
  },
  inputOutline: {
    borderRadius: 8,
  },
  confirmButton: {
    backgroundColor: '#0088ff',
  },
  webNotSupportedText: {
    textAlign: 'center',
    color: '#FF6347',
    fontSize: 14,
    padding: 10,
  },
});
