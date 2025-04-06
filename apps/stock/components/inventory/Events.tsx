import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button, Chip, Modal, TextInput, Title } from 'react-native-paper';
import Toast from 'react-native-toast-message';
import { useIngredientList } from '../../api/useEmployee';
import {
  InventoryEvent,
  useCreateInventoryEvent,
  useInventoryEvents,
  useRejectInventoryEvent,
  useResolveInventoryEvent,
} from '../../api/useInventory';

const EventsManager = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreateModalVisible, setCreateModalVisible] = useState(false);
  const [isResolveModalVisible, setResolveModalVisible] = useState(false);
  const [isRejectModalVisible, setRejectModalVisible] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<InventoryEvent | null>(null);
  const [filterStatus, setFilterStatus] = useState<string | null>(null);

  // 表单状态
  const [newEvent, setNewEvent] = useState<Partial<InventoryEvent>>({
    title: '',
    description: '',
    event_type: 'shortage',
    ingredients: [],
  });
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [rejectReason, setRejectReason] = useState('');

  // 获取数据
  const { data: events, isLoading } = useInventoryEvents();
  const { data: ingredients } = useIngredientList();
  const createEvent = useCreateInventoryEvent(Toast);
  const resolveEvent = useResolveInventoryEvent(Toast);
  const rejectEvent = useRejectInventoryEvent(Toast);

  // 事件类型选项
  const eventTypeOptions = [
    { value: 'shortage', label: '库存短缺' },
    { value: 'excess', label: '库存过剩' },
    { value: 'expiry', label: '临近过期' },
    { value: 'damaged', label: '物品损坏' },
    { value: 'miscount', label: '盘点差异' },
    { value: 'special_request', label: '特殊出库请求' },
    { value: 'other', label: '其他' },
  ];

  // 过滤事件
  const filteredEvents = events
    ? events.filter(event => {
        let statusMatch = true;
        if (filterStatus) {
          statusMatch = event.status === filterStatus;
        }

        const searchMatch =
          event.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          event.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (event.event_type_display &&
            event.event_type_display.toLowerCase().includes(searchQuery.toLowerCase()));

        return statusMatch && searchMatch;
      })
    : [];

  // 处理创建事件
  const handleCreateEvent = () => {
    if (!newEvent.title || !newEvent.description || !newEvent.event_type) {
      Toast.show({
        type: 'error',
        text1: '输入错误',
        text2: '请填写所有必填字段',
      });
      return;
    }

    createEvent.mutate(newEvent as InventoryEvent, {
      onSuccess: () => {
        setCreateModalVisible(false);
        setNewEvent({
          title: '',
          description: '',
          event_type: 'shortage',
          ingredients: [],
        });
      },
    });
  };

  // 处理解决事件
  const handleResolveEvent = () => {
    if (!selectedEvent || !resolutionNotes) {
      Toast.show({
        type: 'error',
        text1: '输入错误',
        text2: '请填写解决方案',
      });
      return;
    }

    resolveEvent.mutate(
      {
        id: selectedEvent.id as number,
        data: { resolution_notes: resolutionNotes },
      },
      {
        onSuccess: () => {
          setResolveModalVisible(false);
          setResolutionNotes('');
          setSelectedEvent(null);
        },
      },
    );
  };

  // 处理拒绝事件
  const handleRejectEvent = () => {
    if (!selectedEvent || !rejectReason) {
      Toast.show({
        type: 'error',
        text1: '输入错误',
        text2: '请填写拒绝理由',
      });
      return;
    }

    rejectEvent.mutate(
      {
        id: selectedEvent.id as number,
        data: { reason: rejectReason },
      },
      {
        onSuccess: () => {
          setRejectModalVisible(false);
          setRejectReason('');
          setSelectedEvent(null);
        },
      },
    );
  };

  // 选择食材
  const handleIngredientSelect = (ingredientId: number) => {
    if (!newEvent.ingredients) {
      setNewEvent({
        ...newEvent,
        ingredients: [ingredientId],
      });
      return;
    }

    const isSelected = newEvent.ingredients.includes(ingredientId);
    let updatedIngredients;

    if (isSelected) {
      updatedIngredients = newEvent.ingredients.filter(id => id !== ingredientId);
    } else {
      updatedIngredients = [...newEvent.ingredients, ingredientId];
    }

    setNewEvent({
      ...newEvent,
      ingredients: updatedIngredients,
    });
  };

  return (
    <View style={styles.container}>
      {/* 创建事件模态框 */}
      <Modal
        visible={isCreateModalVisible}
        onDismiss={() => setCreateModalVisible(false)}
        contentContainerStyle={styles.modalContent}
      >
        <ScrollView>
          <Title>创建库存事件</Title>

          <TextInput
            label="事件标题"
            value={newEvent.title}
            onChangeText={text => setNewEvent({ ...newEvent, title: text })}
            style={styles.input}
          />

          <TextInput
            label="事件描述"
            value={newEvent.description}
            onChangeText={text => setNewEvent({ ...newEvent, description: text })}
            multiline
            numberOfLines={4}
            style={styles.input}
          />

          <Text style={styles.label}>事件类型</Text>
          <View style={styles.eventTypeContainer}>
            {eventTypeOptions.map(option => (
              <Chip
                key={option.value}
                selected={newEvent.event_type === option.value}
                onPress={() => setNewEvent({ ...newEvent, event_type: option.value as any })}
                style={[styles.chip, newEvent.event_type === option.value && styles.selectedChip]}
                textStyle={
                  newEvent.event_type === option.value ? styles.selectedChipText : undefined
                }
              >
                {option.label}
              </Chip>
            ))}
          </View>

          <Text style={styles.label}>相关食材</Text>
          <View style={styles.ingredientsContainer}>
            {ingredients ? (
              ingredients.map(ingredient => (
                <Chip
                  key={ingredient.id}
                  selected={newEvent.ingredients?.includes(ingredient.id)}
                  onPress={() => handleIngredientSelect(ingredient.id)}
                  style={[
                    styles.chip,
                    newEvent.ingredients?.includes(ingredient.id) && styles.selectedChip,
                  ]}
                  textStyle={
                    newEvent.ingredients?.includes(ingredient.id)
                      ? styles.selectedChipText
                      : undefined
                  }
                >
                  {ingredient.name}
                </Chip>
              ))
            ) : (
              <Text>加载食材中...</Text>
            )}
          </View>

          <View style={styles.modalButtons}>
            <Button
              mode="outlined"
              onPress={() => setCreateModalVisible(false)}
              style={styles.button}
            >
              取消
            </Button>
            <Button
              mode="contained"
              onPress={handleCreateEvent}
              loading={createEvent.isPending}
              style={styles.button}
            >
              创建
            </Button>
          </View>
        </ScrollView>
      </Modal>

      {/* 解决事件模态框 */}
      <Modal
        visible={isResolveModalVisible}
        onDismiss={() => setResolveModalVisible(false)}
        contentContainerStyle={styles.modalContent}
      >
        <Title>解决库存事件</Title>
        <Text style={styles.eventTitle}>{selectedEvent?.title}</Text>

        <TextInput
          label="解决方案"
          value={resolutionNotes}
          onChangeText={setResolutionNotes}
          multiline
          numberOfLines={4}
          style={styles.input}
        />

        <View style={styles.modalButtons}>
          <Button
            mode="outlined"
            onPress={() => setResolveModalVisible(false)}
            style={styles.button}
          >
            取消
          </Button>
          <Button
            mode="contained"
            onPress={handleResolveEvent}
            loading={resolveEvent.isPending}
            style={styles.button}
          >
            确认解决
          </Button>
        </View>
      </Modal>

      {/* 拒绝事件模态框 */}
      <Modal
        visible={isRejectModalVisible}
        onDismiss={() => setRejectModalVisible(false)}
        contentContainerStyle={styles.modalContent}
      >
        <Title>拒绝库存事件</Title>
        <Text style={styles.eventTitle}>{selectedEvent?.title}</Text>

        <TextInput
          label="拒绝理由"
          value={rejectReason}
          onChangeText={setRejectReason}
          multiline
          numberOfLines={4}
          style={styles.input}
        />

        <View style={styles.modalButtons}>
          <Button
            mode="outlined"
            onPress={() => setRejectModalVisible(false)}
            style={styles.button}
          >
            取消
          </Button>
          <Button
            mode="contained"
            onPress={handleRejectEvent}
            loading={rejectEvent.isPending}
            style={styles.button}
          >
            确认拒绝
          </Button>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#f5f5f5',
  },
  card: {
    marginBottom: 16,
  },
  filterContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 16,
    flexWrap: 'wrap',
  },
  searchBar: {
    flex: 1,
    marginRight: 8,
  },
  statusFilterContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 8,
  },
  filterButton: {
    marginHorizontal: 8,
  },
  statusMenu: {
    marginTop: 50,
  },
  createButton: {
    marginLeft: 'auto',
  },
  tableContainer: {
    maxHeight: 500,
  },
  loader: {
    marginTop: 16,
  },
  actionButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  chipText: {
    color: 'white',
  },
  modalContent: {
    backgroundColor: 'white',
    padding: 20,
    margin: 20,
    borderRadius: 8,
    maxHeight: '80%',
  },
  input: {
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    marginBottom: 8,
    marginTop: 8,
  },
  eventTypeContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
  },
  ingredientsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
  },
  chip: {
    margin: 4,
  },
  selectedChip: {
    backgroundColor: '#2196F3',
  },
  selectedChipText: {
    color: 'white',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 16,
  },
  button: {
    marginLeft: 8,
  },
  eventTitle: {
    fontSize: 18,
    marginBottom: 16,
  },
});

export default EventsManager;
