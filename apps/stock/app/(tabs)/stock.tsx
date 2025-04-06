// import { useCurrentUser } from '@/api/useAuth';
// import {
//   Ingredient,
//   TaskItem,
//   useCompleteTask,
//   useIngredientList,
//   useInventoryOperation,
//   useSubmitFeedback,
//   useTasks,
// } from '@/api/useEmployee';
// import MaterialIcons from '@expo/vector-icons/MaterialIcons';
// import { format } from 'date-fns';
// import React, { useState } from 'react';
// import {
//   ActivityIndicator,
//   Alert,
//   FlatList,
//   Modal,
//   ScrollView,
//   StyleSheet,
//   Text,
//   TextInput,
//   TouchableOpacity,
//   View,
// } from 'react-native';
// import { SafeAreaView } from 'react-native-safe-area-context';
// import Toast from 'react-native-toast-message';

// const EmployeeScreen = () => {
//   // 状态管理
//   const [activeTab, setActiveTab] = useState('inventory'); // 'inventory' 或 'workspace'
//   const [selectedIngredient, setSelectedIngredient] = useState<Ingredient | null>(null);
//   const [operationQuantity, setOperationQuantity] = useState('');
//   const [operationNote, setOperationNote] = useState('');
//   const [operationModalVisible, setOperationModalVisible] = useState(false);
//   const [operationType, setOperationType] = useState<'in' | 'out'>('in');
//   const [modalVisible, setModalVisible] = useState(false);
//   const [feedbackTitle, setFeedbackTitle] = useState('');
//   const [feedbackDescription, setFeedbackDescription] = useState('');
//   const [searchQuery, setSearchQuery] = useState('');

//   // API Hooks
//   const { data: user } = useCurrentUser();
//   const { data: ingredients, isLoading: isLoadingIngredients } = useIngredientList();
//   const { data: tasks, isLoading: isLoadingTasks } = useTasks();
//   const { mutate: performOperation, isPending: isOperationPending } = useInventoryOperation(Toast);
//   const { mutate: completeTask, isPending: isTaskCompletePending } = useCompleteTask(Toast);
//   const { mutate: submitFeedback, isPending: isFeedbackSubmitting } = useSubmitFeedback(Toast);

//   // 过滤食材列表
//   const filteredIngredients =
//     ingredients?.filter(
//       ingredient =>
//         ingredient.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
//         ingredient.category.toLowerCase().includes(searchQuery.toLowerCase()),
//     ) || [];

//   // 处理出入库操作
//   const handleOperationPress = (ingredient: Ingredient, type: 'in' | 'out') => {
//     setSelectedIngredient(ingredient);
//     setOperationType(type);
//     setOperationQuantity('');
//     setOperationNote('');
//     setOperationModalVisible(true);
//   };

//   // 提交出入库操作
//   const submitOperation = () => {
//     if (
//       !selectedIngredient ||
//       !operationQuantity ||
//       isNaN(Number(operationQuantity)) ||
//       Number(operationQuantity) <= 0
//     ) {
//       Toast.show({
//         type: 'error',
//         text1: '无效数量',
//         text2: '请输入有效的数量',
//       });
//       return;
//     }

//     // 出库时检查库存是否足够
//     if (operationType === 'out' && Number(operationQuantity) > selectedIngredient.quantity) {
//       Toast.show({
//         type: 'error',
//         text1: '库存不足',
//         text2: `当前库存仅有 ${selectedIngredient.quantity} ${selectedIngredient.unit}`,
//       });
//       return;
//     }

//     // 执行操作
//     performOperation({
//       ingredient: selectedIngredient.id,
//       operation_type: operationType,
//       quantity: Number(operationQuantity),
//       operator: user?.id,
//       name: selectedIngredient.name,
//       expiry_date: selectedIngredient.expiry_date,
//       unit: selectedIngredient.unit,
//       // notes: operationNote,
//     });

//     // 关闭模态框
//     setOperationModalVisible(false);
//   };

//   // 提交反馈
//   const handleSubmitFeedback = () => {
//     if (!feedbackTitle.trim() || !feedbackDescription.trim()) {
//       Toast.show({
//         type: 'error',
//         text1: '请填写完整',
//         text2: '标题和描述不能为空',
//       });
//       return;
//     }

//     submitFeedback({
//       title: feedbackTitle,
//       description: feedbackDescription,
//     });

//     // 清空表单并关闭模态框
//     setFeedbackTitle('');
//     setFeedbackDescription('');
//     setModalVisible(false);
//   };

//   // 处理任务完成
//   const handleCompleteTask = (task: TaskItem) => {
//     Alert.alert('完成任务', `确认将任务 "${task.title}" 标记为已完成？`, [
//       { text: '取消', style: 'cancel' },
//       {
//         text: '确认',
//         onPress: () => completeTask(task.id),
//       },
//     ]);
//   };

//   // 加载状态
//   if (
//     (isLoadingIngredients && activeTab === 'inventory') ||
//     (isLoadingTasks && activeTab === 'workspace')
//   ) {
//     return (
//       <View style={styles.loadingContainer}>
//         <ActivityIndicator size="large" color="#007aff" />
//         <Text>加载中...</Text>
//       </View>
//     );
//   }

//   return (
//     <SafeAreaView style={styles.container}>
//       {/* 顶部标题栏 */}
//       <View style={styles.header}>
//         <Text style={styles.headerTitle}>员工工作站</Text>
//       </View>

//       {/* 标签选择器 */}
//       <View style={styles.tabContainer}>
//         <TouchableOpacity
//           style={[styles.tabButton, activeTab === 'inventory' && styles.activeTabButton]}
//           onPress={() => setActiveTab('inventory')}
//         >
//           <Text style={[styles.tabText, activeTab === 'inventory' && styles.activeTabText]}>
//             食材管理
//           </Text>
//         </TouchableOpacity>
//         <TouchableOpacity
//           style={[styles.tabButton, activeTab === 'workspace' && styles.activeTabButton]}
//           onPress={() => setActiveTab('workspace')}
//         >
//           <Text style={[styles.tabText, activeTab === 'workspace' && styles.activeTabText]}>
//             个人工作台
//           </Text>
//         </TouchableOpacity>
//       </View>

//       {/* 内容区域 */}
//       {activeTab === 'inventory' ? (
//         <View style={styles.contentContainer}>
//           {/* 搜索栏 */}
//           <View style={styles.searchContainer}>
//             <MaterialIcons name="search" size={24} color="#999" />
//             <TextInput
//               style={styles.searchInput}
//               placeholder="搜索食材..."
//               value={searchQuery}
//               onChangeText={setSearchQuery}
//             />
//             {searchQuery ? (
//               <TouchableOpacity onPress={() => setSearchQuery('')}>
//                 <MaterialIcons name="close" size={24} color="#999" />
//               </TouchableOpacity>
//             ) : null}
//           </View>

//           {/* 食材列表 */}
//           <FlatList
//             data={filteredIngredients}
//             keyExtractor={item => item.id.toString()}
//             renderItem={({ item }) => (
//               <View style={styles.ingredientCard}>
//                 <View style={styles.ingredientInfo}>
//                   <Text style={styles.ingredientName}>{item.name}</Text>
//                   <Text style={styles.ingredientCategory}>分类: {item.category}</Text>
//                   <Text style={styles.ingredientDetail}>
//                     库存: {item.quantity} {item.unit} | 位置: {item.location}
//                   </Text>
//                   <Text
//                     style={[
//                       styles.expiryDate,
//                       new Date(item.expiry_date) < new Date() && styles.expired,
//                     ]}
//                   >
//                     到期日: {format(new Date(item.expiry_date), 'yyyy-MM-dd')}
//                   </Text>
//                 </View>
//                 <View style={styles.actionButtons}>
//                   <TouchableOpacity
//                     style={[styles.actionButton, styles.inButton]}
//                     onPress={() => handleOperationPress(item, 'in')}
//                   >
//                     <Text style={styles.actionButtonText}>入库</Text>
//                   </TouchableOpacity>
//                   <TouchableOpacity
//                     style={[styles.actionButton, styles.outButton]}
//                     onPress={() => handleOperationPress(item, 'out')}
//                   >
//                     <Text style={styles.actionButtonText}>出库</Text>
//                   </TouchableOpacity>
//                 </View>
//               </View>
//             )}
//             ListEmptyComponent={() => (
//               <View style={styles.emptyContainer}>
//                 <MaterialIcons name="inventory" size={48} color="#ccc" />
//                 <Text style={styles.emptyText}>
//                   {searchQuery ? '没有找到匹配的食材' : '暂无食材数据'}
//                 </Text>
//               </View>
//             )}
//           />
//         </View>
//       ) : (
//         <View style={styles.contentContainer}>
//           {/* 个人工作台 */}
//           <ScrollView>
//             {/* <View style={styles.sectionContainer}>
//               <View style={styles.sectionHeader}>
//                 <Text style={styles.sectionTitle}>待办任务</Text>
//               </View>

//               {(tasks?.filter(task => task.status === 'pending') || []).length > 0 ? (
//                 tasks
//                   ?.filter(task => task.status === 'pending')
//                   .map(task => (
//                     <View key={task.id} style={styles.taskItem}>
//                       <View style={styles.taskInfo}>
//                         <View style={styles.taskHeader}>
//                           <Text style={styles.taskTitle}>{task.title}</Text>
//                           <View
//                             style={[
//                               styles.priorityBadge,
//                               task.priority === 'high' && styles.highPriority,
//                               task.priority === 'medium' && styles.mediumPriority,
//                               task.priority === 'low' && styles.lowPriority,
//                             ]}
//                           >
//                             <Text style={styles.priorityText}>
//                               {task.priority === 'high'
//                                 ? '高'
//                                 : task.priority === 'medium'
//                                   ? '中'
//                                   : '低'}
//                             </Text>
//                           </View>
//                         </View>
//                         <Text style={styles.taskDescription}>{task.description}</Text>
//                         <Text style={styles.taskDate}>
//                           截止日期: {format(new Date(task.due_date), 'yyyy-MM-dd')}
//                         </Text>
//                       </View>
//                       <TouchableOpacity
//                         style={styles.completeButton}
//                         onPress={() => handleCompleteTask(task)}
//                         disabled={isTaskCompletePending}
//                       >
//                         <Text style={styles.completeButtonText}>完成</Text>
//                       </TouchableOpacity>
//                     </View>
//                   ))
//               ) : (
//                 <View style={styles.emptyContainer}>
//                   <MaterialIcons name="check-circle" size={48} color="#ccc" />
//                   <Text style={styles.emptyText}>暂无待办任务</Text>
//                 </View>
//               )}
//             </View> */}
//             {/* 异常反馈按钮 */}
//             <TouchableOpacity style={styles.feedbackButton} onPress={() => setModalVisible(true)}>
//               <MaterialIcons name="feedback" size={24} color="#fff" />
//               <Text style={styles.feedbackButtonText}>提交异常反馈</Text>
//             </TouchableOpacity>
//           </ScrollView>
//         </View>
//       )}

//       {/* 出入库操作模态框 */}
//       <Modal
//         visible={operationModalVisible}
//         transparent={true}
//         animationType="slide"
//         onRequestClose={() => setOperationModalVisible(false)}
//       >
//         <View style={styles.modalBackground}>
//           <View style={styles.modalContainer}>
//             <Text style={styles.modalTitle}>
//               {operationType === 'in' ? '入库操作' : '出库操作'}: {selectedIngredient?.name}
//             </Text>

//             <Text style={styles.modalLabel}>
//               当前库存: {selectedIngredient?.quantity} {selectedIngredient?.unit}
//             </Text>

//             <Text style={styles.modalLabel}>数量:</Text>
//             <TextInput
//               style={styles.modalInput}
//               keyboardType="numeric"
//               value={operationQuantity}
//               onChangeText={setOperationQuantity}
//               placeholder={`请输入${operationType === 'in' ? '入库' : '出库'}数量`}
//             />

//             <Text style={styles.modalLabel}>备注:</Text>
//             <TextInput
//               style={[styles.modalInput, styles.textArea]}
//               value={operationNote}
//               onChangeText={setOperationNote}
//               placeholder="可选备注信息"
//               multiline
//             />

//             <View style={styles.modalButtons}>
//               <TouchableOpacity
//                 style={[styles.modalButton, styles.cancelButton]}
//                 onPress={() => setOperationModalVisible(false)}
//               >
//                 <Text style={styles.cancelButtonText}>取消</Text>
//               </TouchableOpacity>
//               <TouchableOpacity
//                 style={[styles.modalButton, styles.confirmButton]}
//                 onPress={submitOperation}
//                 disabled={isOperationPending}
//               >
//                 <Text style={styles.confirmButtonText}>
//                   {isOperationPending ? '处理中...' : '确认'}
//                 </Text>
//               </TouchableOpacity>
//             </View>
//           </View>
//         </View>
//       </Modal>

//       {/* 异常反馈模态框 */}
//       <Modal
//         visible={modalVisible}
//         transparent={true}
//         animationType="slide"
//         onRequestClose={() => setModalVisible(false)}
//       >
//         <View style={styles.modalBackground}>
//           <View style={styles.modalContainer}>
//             <Text style={styles.modalTitle}>提交异常反馈</Text>

//             <Text style={styles.modalLabel}>标题:</Text>
//             <TextInput
//               style={styles.modalInput}
//               value={feedbackTitle}
//               onChangeText={setFeedbackTitle}
//               placeholder="请输入反馈标题"
//             />

//             <Text style={styles.modalLabel}>详细描述:</Text>
//             <TextInput
//               style={[styles.modalInput, styles.textArea]}
//               value={feedbackDescription}
//               onChangeText={setFeedbackDescription}
//               placeholder="请详细描述异常情况"
//               multiline
//             />

//             <View style={styles.modalButtons}>
//               <TouchableOpacity
//                 style={[styles.modalButton, styles.cancelButton]}
//                 onPress={() => setModalVisible(false)}
//               >
//                 <Text style={styles.cancelButtonText}>取消</Text>
//               </TouchableOpacity>
//               <TouchableOpacity
//                 style={[styles.modalButton, styles.confirmButton]}
//                 onPress={handleSubmitFeedback}
//                 disabled={isFeedbackSubmitting}
//               >
//                 <Text style={styles.confirmButtonText}>
//                   {isFeedbackSubmitting ? '提交中...' : '提交'}
//                 </Text>
//               </TouchableOpacity>
//             </View>
//           </View>
//         </View>
//       </Modal>
//       <Toast />
//     </SafeAreaView>
//   );
// };

// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//     backgroundColor: '#f5f5f5',
//   },
//   loadingContainer: {
//     flex: 1,
//     justifyContent: 'center',
//     alignItems: 'center',
//   },
//   header: {
//     paddingVertical: 20,
//     paddingHorizontal: 20,
//     backgroundColor: '#ffffff',
//   },
//   headerTitle: {
//     fontSize: 22,
//     fontWeight: 'bold',
//     color: '#333',
//   },
//   tabContainer: {
//     flexDirection: 'row',
//     backgroundColor: '#ffffff',
//     borderBottomWidth: 1,
//     borderBottomColor: '#e1e1e1',
//   },
//   tabButton: {
//     flex: 1,
//     paddingVertical: 15,
//     alignItems: 'center',
//   },
//   activeTabButton: {
//     borderBottomWidth: 2,
//     borderBottomColor: '#007aff',
//   },
//   tabText: {
//     fontSize: 16,
//     color: '#666',
//   },
//   activeTabText: {
//     color: '#007aff',
//     fontWeight: 'bold',
//   },
//   contentContainer: {
//     flex: 1,
//   },
//   searchContainer: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     backgroundColor: '#fff',
//     margin: 10,
//     paddingHorizontal: 15,
//     paddingVertical: 8,
//     borderRadius: 8,
//     borderWidth: 1,
//     borderColor: '#e1e1e1',
//   },
//   searchInput: {
//     flex: 1,
//     marginLeft: 10,
//     fontSize: 16,
//   },
//   ingredientCard: {
//     flexDirection: 'row',
//     backgroundColor: '#fff',
//     marginHorizontal: 10,
//     marginVertical: 6,
//     padding: 15,
//     borderRadius: 8,
//     borderWidth: 1,
//     borderColor: '#e1e1e1',
//     justifyContent: 'space-between',
//   },
//   ingredientInfo: {
//     flex: 1,
//   },
//   ingredientName: {
//     fontSize: 18,
//     fontWeight: 'bold',
//     marginBottom: 5,
//   },
//   ingredientCategory: {
//     fontSize: 14,
//     color: '#666',
//     marginBottom: 5,
//   },
//   ingredientDetail: {
//     fontSize: 14,
//     color: '#555',
//     marginBottom: 5,
//   },
//   expiryDate: {
//     fontSize: 14,
//     color: '#555',
//   },
//   expired: {
//     color: 'red',
//   },
//   actionButtons: {
//     justifyContent: 'center',
//   },
//   actionButton: {
//     paddingHorizontal: 15,
//     paddingVertical: 8,
//     borderRadius: 5,
//     marginBottom: 5,
//     alignItems: 'center',
//   },
//   inButton: {
//     backgroundColor: '#4caf50',
//   },
//   outButton: {
//     backgroundColor: '#ff9800',
//   },
//   actionButtonText: {
//     color: '#fff',
//     fontWeight: 'bold',
//   },
//   sectionContainer: {
//     backgroundColor: '#fff',
//     margin: 10,
//     borderRadius: 8,
//     borderWidth: 1,
//     borderColor: '#e1e1e1',
//     overflow: 'hidden',
//   },
//   sectionHeader: {
//     backgroundColor: '#f9f9f9',
//     padding: 15,
//     borderBottomWidth: 1,
//     borderBottomColor: '#e1e1e1',
//   },
//   sectionTitle: {
//     fontSize: 18,
//     fontWeight: 'bold',
//     color: '#333',
//   },
//   taskItem: {
//     flexDirection: 'row',
//     padding: 15,
//     borderBottomWidth: 1,
//     borderBottomColor: '#e1e1e1',
//     alignItems: 'center',
//   },
//   taskInfo: {
//     flex: 1,
//   },
//   taskHeader: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     marginBottom: 5,
//   },
//   taskTitle: {
//     fontSize: 16,
//     fontWeight: 'bold',
//     marginRight: 8,
//   },
//   priorityBadge: {
//     paddingHorizontal: 8,
//     paddingVertical: 2,
//     borderRadius: 10,
//     backgroundColor: '#e1e1e1',
//   },
//   highPriority: {
//     backgroundColor: '#ff5252',
//   },
//   mediumPriority: {
//     backgroundColor: '#ff9800',
//   },
//   lowPriority: {
//     backgroundColor: '#4caf50',
//   },
//   priorityText: {
//     color: '#fff',
//     fontSize: 12,
//     fontWeight: 'bold',
//   },
//   taskDescription: {
//     fontSize: 14,
//     color: '#555',
//     marginBottom: 5,
//   },
//   taskDate: {
//     fontSize: 12,
//     color: '#888',
//   },
//   completeButton: {
//     backgroundColor: '#007aff',
//     paddingHorizontal: 15,
//     paddingVertical: 8,
//     borderRadius: 5,
//   },
//   completeButtonText: {
//     color: '#fff',
//     fontWeight: 'bold',
//   },
//   feedbackButton: {
//     flexDirection: 'row',
//     backgroundColor: '#007aff',
//     margin: 10,
//     padding: 15,
//     borderRadius: 8,
//     alignItems: 'center',
//     justifyContent: 'center',
//   },
//   feedbackButtonText: {
//     color: '#fff',
//     fontWeight: 'bold',
//     fontSize: 16,
//     marginLeft: 10,
//   },
//   emptyContainer: {
//     alignItems: 'center',
//     justifyContent: 'center',
//     padding: 40,
//   },
//   emptyText: {
//     marginTop: 10,
//     fontSize: 16,
//     color: '#999',
//   },
//   modalBackground: {
//     flex: 1,
//     backgroundColor: 'rgba(0,0,0,0.5)',
//     justifyContent: 'center',
//     alignItems: 'center',
//   },
//   modalContainer: {
//     width: '90%',
//     backgroundColor: '#fff',
//     borderRadius: 8,
//     padding: 20,
//   },
//   modalTitle: {
//     fontSize: 18,
//     fontWeight: 'bold',
//     marginBottom: 15,
//     textAlign: 'center',
//   },
//   modalLabel: {
//     fontSize: 16,
//     marginBottom: 5,
//     color: '#555',
//   },
//   modalInput: {
//     borderWidth: 1,
//     borderColor: '#e1e1e1',
//     borderRadius: 5,
//     padding: 10,
//     marginBottom: 15,
//     fontSize: 16,
//   },
//   textArea: {
//     height: 100,
//     textAlignVertical: 'top',
//   },
//   modalButtons: {
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//     marginTop: 10,
//   },
//   modalButton: {
//     flex: 1,
//     paddingVertical: 12,
//     borderRadius: 5,
//     alignItems: 'center',
//     marginHorizontal: 5,
//   },
//   cancelButton: {
//     backgroundColor: '#f2f2f2',
//   },
//   cancelButtonText: {
//     color: '#666',
//     fontWeight: 'bold',
//   },
//   confirmButton: {
//     backgroundColor: '#007aff',
//   },
//   confirmButtonText: {
//     color: '#fff',
//     fontWeight: 'bold',
//   },
// });

// export default EmployeeScreen;
