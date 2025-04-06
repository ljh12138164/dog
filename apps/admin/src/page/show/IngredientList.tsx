import React, { useState } from 'react';
import { useIngredients, useDeleteIngredient, Ingredient } from '../../api/useShow';

interface IngredientListProps {
  onAddNew: () => void;
  onEdit: (ingredient: Ingredient) => void;
}

const IngredientList: React.FC<IngredientListProps> = ({ onAddNew, onEdit }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const { data: ingredients, isLoading, error } = useIngredients();
  const deleteIngredient = useDeleteIngredient();

  // 处理删除操作
  const handleDelete = (id: number) => {
    if (window.confirm('确定要删除这个食材吗？此操作不可撤销。')) {
      deleteIngredient.mutate(id);
    }
  };

  // 过滤食材
  const filteredIngredients = ingredients?.filter(
    ingredient =>
      ingredient.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ingredient.category.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  // 渲染食材状态标签
  const renderStatusBadge = (status: string) => {
    let badgeClass = 'badge badge-normal';
    let text = '正常';

    switch (status) {
      case 'expired':
        badgeClass = 'badge badge-expired';
        text = '已过期';
        break;
      case 'low':
        badgeClass = 'badge badge-low';
        text = '库存不足';
        break;
      case 'pending_check':
        badgeClass = 'badge badge-pending_check';
        text = '待检查';
        break;
      default:
        badgeClass = 'badge badge-normal';
        text = '正常';
    }

    return <span className={badgeClass}>{text}</span>;
  };

  if (isLoading) {
    return (
      <div className="center-container">
        <div className="spinner"></div>
        <p className="loading-text">加载食材列表中...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="center-container">
        <p className="error-text">加载失败: {(error as Error).message}</p>
        <button onClick={() => window.location.reload()}>重试</button>
      </div>
    );
  }

  return (
    <div className="list-container">
      <div className="list-header">
        <h2 className="list-title">食材列表</h2>
        <button className="add-button" onClick={onAddNew}>
          + 添加食材
        </button>
      </div>

      <input
        className="search-input"
        placeholder="搜索食材名称或分类..."
        value={searchQuery}
        onChange={e => setSearchQuery(e.target.value)}
      />

      {filteredIngredients && filteredIngredients.length > 0 ? (
        <div>
          {filteredIngredients.map(item => (
            <div key={item.id} className="item-container">
              <div className="item-content">
                <div className="item-header">
                  <h3 className="item-name">{item.name}</h3>
                  {renderStatusBadge(item.status)}
                </div>
                <p className="item-category">分类: {item.category}</p>
                <p>
                  数量: {item.quantity} {item.unit}
                </p>
              </div>
              <div className="item-actions">
                <button className="button edit-button" onClick={() => onEdit(item)}>
                  编辑
                </button>
                <button className="button delete-button" onClick={() => handleDelete(item.id!)}>
                  删除
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="empty-container">
          <p className="empty-text">{searchQuery ? '没有找到匹配的食材' : '食材列表为空'}</p>
        </div>
      )}
    </div>
  );
};

export default IngredientList;
