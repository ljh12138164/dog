import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Alert } from 'react-native';
import {
  Button,
  Card,
  TextInput,
  SegmentedButtons,
  List,
  Divider,
  Badge,
  IconButton,
} from 'react-native-paper';
import { useIngredientOperation, Ingredient, InventoryOperation } from '../../api/useOrdinary';
import { format } from 'date-fns';

export default function InventoryOperations() {
  const { ingredients, isLoadingIngredients, handleInventoryOperation, isOperationLoading } =
    useIngredientOperation();

  const [operations, setOperations] = useState<InventoryOperation[]>([]);
  const [selectedIngredientId, setSelectedIngredientId] = useState<number | null>(null);
  const [quantity, setQuantity] = useState<string>('');
  const [operationType, setOperationType] = useState<'in' | 'out'>('in');
  const [notes, setNotes] = useState<string>('');
  const [showIngredientList, setShowIngredientList] = useState(false);

  // 获取当前选中的食材
  const selectedIngredient = ingredients?.find(item => item.id === selectedIngredientId);

  // 添加到操作列表
  const addToOperationList = () => {
    if (!selectedIngredientId) {
      Alert.alert('错误', '请选择食材');
      return;
    }

    const numQuantity = parseFloat(quantity);
    if (isNaN(numQuantity) || numQuantity <= 0) {
      Alert.alert('错误', '请输入有效的数量');
      return;
    }

    // 检查出库时数量不能大于库存
    if (operationType === 'out' && selectedIngredient) {
      if (numQuantity > selectedIngredient.quantity) {
        Alert.alert(
          '错误',
          `出库数量不能大于当前库存 (${selectedIngredient.quantity} ${selectedIngredient.unit})`,
        );
        return;
      }
    }

    const newOperation: InventoryOperation = {
      ingredient: selectedIngredientId,
      operation_type: operationType,
      quantity: numQuantity,
      notes: notes,
    };

    setOperations([...operations, newOperation]);

    // 重置表单
    setSelectedIngredientId(null);
    setQuantity('');
    setNotes('');
  };

  // 移除操作
  const removeOperation = (index: number) => {
    const newOperations = [...operations];
    newOperations.splice(index, 1);
    setOperations(newOperations);
  };

  // 提交操作
  const submitOperations = async () => {
    if (operations.length === 0) {
      Alert.alert('错误', '请添加至少一个操作');
      return;
    }

    try {
      for (const operation of operations) {
        await handleInventoryOperation(
          operation.operation_type,
          operation.ingredient,
          operation.quantity,
          operation.notes,
        );
      }

      Alert.alert('成功', '所有操作已成功提交');
      setOperations([]);
    } catch (error) {
      Alert.alert('错误', `提交操作失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  };

  const getIngredientName = (id: number) => {
    return ingredients?.find(i => i.id === id)?.name || `未知食材 (#${id})`;
  };

  const getIngredientUnit = (id: number) => {
    return ingredients?.find(i => i.id === id)?.unit || '单位';
  };

  if (isLoadingIngredients) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" />
        <Text style={styles.loadingText}>加载食材中...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <Card style={styles.card}>
        <Card.Title title="食材出入库操作" />
        <Card.Content>
          <SegmentedButtons
            value={operationType}
            onValueChange={value => setOperationType(value as 'in' | 'out')}
            buttons={[
              { value: 'in', label: '入库' },
              { value: 'out', label: '出库' },
            ]}
            style={styles.segmentedButtons}
          />

          <TextInput
            label="选择食材"
            value={selectedIngredient ? selectedIngredient.name : ''}
            onFocus={() => setShowIngredientList(true)}
            right={
              <TextInput.Icon
                icon={() => (
                  <IconButton
                    icon="menu-down"
                    onPress={() => setShowIngredientList(!showIngredientList)}
                  />
                )}
              />
            }
            style={styles.input}
            readOnly
          />

          {showIngredientList && ingredients && (
            <Card style={styles.dropdownCard}>
              <ScrollView style={styles.dropdownScroll}>
                {ingredients.map(ingredient => (
                  <List.Item
                    key={ingredient.id}
                    title={ingredient.name}
                    description={`库存: ${ingredient.quantity} ${ingredient.unit} | 分类: ${ingredient.category}`}
                    right={() => {
                      let color = 'green';
                      if (ingredient.status === 'expired') color = 'red';
                      else if (ingredient.status === 'low') color = 'orange';
                      else if (ingredient.status === 'pending_check') color = 'blue';
                      return (
                        <Badge style={{ backgroundColor: color, marginTop: 15 }}>
                          {ingredient.status}
                        </Badge>
                      );
                    }}
                    onPress={() => {
                      setSelectedIngredientId(ingredient.id);
                      setShowIngredientList(false);
                    }}
                  />
                ))}
              </ScrollView>
            </Card>
          )}

          {selectedIngredient && (
            <View style={styles.infoContainer}>
              <Text>
                当前库存: {selectedIngredient.quantity} {selectedIngredient.unit}
              </Text>
              <Text>
                过期日期: {format(new Date(selectedIngredient.expiry_date), 'yyyy-MM-dd')}
              </Text>
            </View>
          )}

          <TextInput
            label={`数量 ${selectedIngredient ? `(${selectedIngredient.unit})` : ''}`}
            value={quantity}
            onChangeText={setQuantity}
            keyboardType="numeric"
            style={styles.input}
          />

          <TextInput
            label="备注"
            value={notes}
            onChangeText={setNotes}
            multiline
            style={styles.input}
          />

          <Button
            mode="outlined"
            onPress={addToOperationList}
            style={styles.button}
            disabled={!selectedIngredientId || !quantity}
          >
            添加到操作列表
          </Button>
        </Card.Content>
      </Card>

      {operations.length > 0 && (
        <Card style={styles.card}>
          <Card.Title title="待处理操作" subtitle={`共 ${operations.length} 条操作`} />
          <Card.Content>
            {operations.map((operation, index) => (
              <View key={index}>
                <List.Item
                  title={`${operation.operation_type === 'in' ? '入库' : '出库'}: ${getIngredientName(operation.ingredient)}`}
                  description={`数量: ${operation.quantity} ${getIngredientUnit(operation.ingredient)}${operation.notes ? ` | 备注: ${operation.notes}` : ''}`}
                  right={props => <List.Icon {...props} icon="delete" />}
                />
                {index < operations.length - 1 && <Divider />}
              </View>
            ))}

            <Button
              mode="contained"
              onPress={submitOperations}
              style={[styles.button, styles.submitButton]}
              loading={isOperationLoading}
              disabled={isOperationLoading}
            >
              提交所有操作
            </Button>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
  },
  card: {
    marginBottom: 16,
  },
  input: {
    marginBottom: 12,
  },
  button: {
    marginTop: 16,
  },
  submitButton: {
    backgroundColor: '#4CAF50',
  },
  segmentedButtons: {
    marginBottom: 12,
  },
  dropdownCard: {
    marginTop: -12,
    marginBottom: 12,
    maxHeight: 200,
  },
  dropdownScroll: {
    maxHeight: 200,
  },
  infoContainer: {
    marginBottom: 12,
    padding: 8,
    backgroundColor: '#f5f5f5',
    borderRadius: 4,
  },
});
