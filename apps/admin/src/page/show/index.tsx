import React, { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import IngredientList from './IngredientList';
import IngredientForm from './IngredientForm';
import { Ingredient } from '../../api/useShow';
import './styles.css'; // 假设我们将添加一个CSS文件

// 创建QueryClient实例
const queryClient = new QueryClient();

export default function Show() {
  // 控制表单模态框的显示
  const [modalVisible, setModalVisible] = useState(false);
  // 当前编辑的食材，如果为null则为添加模式
  const [currentIngredient, setCurrentIngredient] = useState<Ingredient | null>(null);

  // 打开添加新食材的表单
  const handleAddNew = () => {
    setCurrentIngredient(null);
    setModalVisible(true);
  };

  // 打开编辑食材的表单
  const handleEdit = (ingredient: Ingredient) => {
    setCurrentIngredient(ingredient);
    setModalVisible(true);
  };

  // 关闭表单模态框
  const handleCloseModal = () => {
    setModalVisible(false);
    setCurrentIngredient(null);
  };

  return (
    <QueryClientProvider client={queryClient}>
      <div className="container">
        <IngredientList onAddNew={handleAddNew} onEdit={handleEdit} />

        {modalVisible && (
          <div className="modal-overlay">
            <div className="modal-content">
              <IngredientForm
                ingredient={currentIngredient || undefined}
                onClose={handleCloseModal}
              />
            </div>
          </div>
        )}
      </div>
    </QueryClientProvider>
  );
}
