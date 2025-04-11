import React, { useState } from 'react';
import { Alert, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import {
  ActivityIndicator,
  Badge,
  Button,
  Card,
  Divider,
  IconButton,
  Text,
  TextInput,
} from 'react-native-paper';
import { MaterialRequestItem } from '../../api/types';
import { useIngredients } from '../../api/useOrdinary';
import { useCreateMaterialRequest } from '../../api/useProcurement';

export default function MaterialRequestForm({ onSuccess }: { onSuccess?: () => void }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [showIngredientList, setShowIngredientList] = useState(false);
  const [selectedIngredientId, setSelectedIngredientId] = useState<number | null>(null);
  const [quantity, setQuantity] = useState('');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<MaterialRequestItem[]>([]);

  const { data: ingredients, isLoading: isLoadingIngredients } = useIngredients();
  const createMutation = useCreateMaterialRequest();

  // 获取选中的食材
  const selectedIngredient = ingredients?.find(
    ingredient => ingredient.id === selectedIngredientId,
  );

  // 添加食材到申请列表
  const addItemToRequest = () => {
    if (!selectedIngredientId) {
      Alert.alert('错误', '请选择食材');
      return;
    }

    const numQuantity = parseFloat(quantity);
    if (isNaN(numQuantity) || numQuantity <= 0) {
      Alert.alert('错误', '请输入有效的数量');
      return;
    }

    if (!selectedIngredient) {
      return;
    }

    const newItem: MaterialRequestItem = {
      ingredient_id: selectedIngredientId,
      ingredient_name: selectedIngredient.name,
      quantity: numQuantity,
      unit: selectedIngredient.unit,
      notes: notes,
    };

    setItems([...items, newItem]);

    // 重置表单
    setSelectedIngredientId(null);
    setQuantity('');
    setNotes('');
    setShowIngredientList(false);
  };

  // 删除食材项
  const removeItem = (index: number) => {
    const newItems = [...items];
    newItems.splice(index, 1);
    setItems(newItems);
  };

  // 提交申请
  const submitRequest = async () => {
    if (!title.trim()) {
      Alert.alert('错误', '请输入申请标题');
      return;
    }

    if (items.length === 0) {
      Alert.alert('错误', '请至少添加一项食材');
      return;
    }

    try {
      await createMutation.mutateAsync({
        title,
        description,
        status: 'pending',
        items,
      });

      setItems([]);
      Alert.alert('成功', '出库申请已提交', [
        {
          text: '确定',
          onPress: () => {
            // 重置表单
            setTitle('');
            setDescription('');
            setItems([]);

            // 调用成功回调
            if (onSuccess) {
              onSuccess();
            }
          },
        },
      ]);
    } catch (error) {
      Alert.alert('错误', `提交失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  };

  if (isLoadingIngredients) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0088ff" />
        <Text style={styles.loadingText}>加载食材中...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <Card style={styles.card}>
        <Text style={styles.title}>创建出库申请</Text>
        <Card.Content>
          <TextInput
            label="申请标题"
            value={title}
            onChangeText={setTitle}
            style={[styles.input, { backgroundColor: '#fff' }]}
            mode="outlined"
            outlineColor="#333"
            activeOutlineColor="#0088ff"
            textColor="#000"
            placeholderTextColor="#666"
          />

          <TextInput
            label="申请描述（可选）"
            value={description}
            onChangeText={setDescription}
            style={[styles.input, { backgroundColor: '#fff' }]}
            mode="outlined"
            multiline
            numberOfLines={3}
            outlineColor="#333"
            activeOutlineColor="#0088ff"
            textColor="#000"
            placeholderTextColor="#666"
          />

          <Divider style={styles.divider} />
          <Text style={styles.sectionTitle}>添加食材</Text>

          <TextInput
            mode="outlined"
            label="选择食材"
            value={selectedIngredient ? selectedIngredient.name : ''}
            onFocus={() => setShowIngredientList(true)}
            style={[styles.input, { backgroundColor: '#fff' }]}
            outlineColor="#333"
            activeOutlineColor="#0088ff"
            textColor="#000"
            placeholderTextColor="#666"
            right={
              <TextInput.Icon
                icon="menu-down"
                onPress={() => setShowIngredientList(!showIngredientList)}
                color="#000"
              />
            }
          />

          {showIngredientList && ingredients && (
            <Card style={styles.dropdownCard}>
              <ScrollView style={styles.dropdownScroll}>
                {ingredients.map(ingredient => (
                  <TouchableOpacity
                    key={ingredient.id}
                    style={styles.ingredientItem}
                    onPress={() => {
                      setSelectedIngredientId(ingredient.id);
                      setShowIngredientList(false);
                    }}
                  >
                    <View style={styles.ingredientInfo}>
                      <Text style={styles.ingredientName}>{ingredient.name}</Text>
                      <Text style={styles.ingredientMeta}>
                        库存: {ingredient.quantity} {ingredient.unit} | 分类: {ingredient.category}
                      </Text>
                    </View>
              
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </Card>
          )}

          {selectedIngredient && (
            <View style={styles.selectedIngredientInfo}>
              <Text style={styles.infoText}>
                当前库存: {selectedIngredient.quantity} {selectedIngredient.unit}
              </Text>
            </View>
          )}

          <TextInput
            label="数量"
            value={quantity}
            onChangeText={setQuantity}
            keyboardType="numeric"
            style={[styles.input, { backgroundColor: '#fff' }]}
            mode="outlined"
            outlineColor="#333"
            activeOutlineColor="#0088ff"
            textColor="#000"
            placeholderTextColor="#666"
          />

          <TextInput
            label="备注（可选）"
            value={notes}
            onChangeText={setNotes}
            style={[styles.input, { backgroundColor: '#fff' }]}
            mode="outlined"
            outlineColor="#333"
            activeOutlineColor="#0088ff"
            textColor="#000"
            placeholderTextColor="#666"
          />

          <Button
            mode="contained"
            onPress={addItemToRequest}
            style={styles.button}
            disabled={!selectedIngredientId || !quantity}
          >
            添加到申请
          </Button>
        </Card.Content>
      </Card>

      {items.length > 0 && (
        <Card style={styles.card}>
          <Text style={styles.title}>申请食材列表</Text>
          <Text style={styles.itemsCount}>{`共 ${items.length} 项`}</Text>
          <Card.Content>
            {items.map((item, index) => (
              <View key={index} style={styles.itemRow}>
                <View style={styles.itemInfo}>
                  <Text style={styles.itemName}>{item.ingredient_name}</Text>
                  <Text style={styles.itemDetails}>
                    数量: {item.quantity} {item.unit}
                    {item.notes ? ` | 备注: ${item.notes}` : ''}
                  </Text>
                </View>
                <IconButton icon="delete" onPress={() => removeItem(index)} />
                {index < items.length - 1 && <Divider style={styles.itemDivider} />}
              </View>
            ))}
          </Card.Content>
        </Card>
      )}

      <Button
        mode="contained"
        onPress={submitRequest}
        style={styles.submitButton}
        loading={createMutation.isPending}
        disabled={items.length === 0 || !title.trim() || createMutation.isPending}
      >
        提交出库申请
      </Button>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#f5f7fa',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#000',
  },
  card: {
    marginBottom: 16,
    borderRadius: 12,
    backgroundColor: '#ffffff',
    elevation: 2,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0088ff',
    marginVertical: 16,
    marginHorizontal: 16,
  },
  input: {
    marginBottom: 16,
    backgroundColor: '#fff',
    color: '#000',
  },
  divider: {
    marginVertical: 16,
    backgroundColor: '#ecf0f1',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0066cc',
    marginBottom: 16,
  },
  dropdownCard: {
    marginTop: -8,
    marginBottom: 16,
    maxHeight: 200,
  },
  dropdownScroll: {
    maxHeight: 200,
  },
  ingredientItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#ecf0f1',
  },
  ingredientInfo: {
    flex: 1,
  },
  ingredientName: {
    fontSize: 16,
    color: '#0066cc',
    fontWeight: 'bold',
  },
  ingredientMeta: {
    fontSize: 14,
    color: '#666',
  },
  badge: {
    marginLeft: 8,
    backgroundColor: '#95a5a6',
  },
  expiredBadge: {
    backgroundColor: '#e74c3c',
  },
  lowBadge: {
    backgroundColor: '#f39c12',
  },
  pendingBadge: {
    backgroundColor: '#3498db',
  },
  selectedIngredientInfo: {
    marginBottom: 16,
    padding: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ecf0f1',
  },
  infoText: {
    color: '#0066cc',
  },
  button: {
    marginTop: 8,
    backgroundColor: '#0088ff',
    borderRadius: 25,
    paddingVertical: 6,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0066cc',
  },
  itemDetails: {
    fontSize: 14,
    color: '#666',
  },
  itemDivider: {
    marginVertical: 8,
    backgroundColor: '#ecf0f1',
  },
  itemsCount: {
    fontSize: 14,
    color: '#666',
    marginTop: -10,
    marginBottom: 10,
    marginHorizontal: 16,
  },
  submitButton: {
    marginTop: 16,
    marginBottom: 30,
    backgroundColor: '#0088ff',
    borderRadius: 25,
    paddingVertical: 6,
  },
});
