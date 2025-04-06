import React, { useState } from 'react';
import { useAddIngredient, useUpdateIngredient, Ingredient } from '../../api/useShow';

interface IngredientFormProps {
  ingredient?: Ingredient;
  onClose: () => void;
}

// 默认的空食材对象
const defaultIngredient: Ingredient = {
  name: '',
  category: '',
  unit: '',
  quantity: 0,
  expiry_date: new Date().toISOString().split('T')[0], // 保留字段但不显示在UI中
  status: 'normal',
  location: '', // 保留字段但不显示在UI中
};

const IngredientForm: React.FC<IngredientFormProps> = ({ ingredient, onClose }) => {
  // 如果传入了食材，则是编辑模式，否则是添加模式
  const isEditMode = !!ingredient;

  // 表单状态
  const [formData, setFormData] = useState<Ingredient>(isEditMode ? ingredient : defaultIngredient);

  // 表单验证错误
  const [errors, setErrors] = useState<Record<string, string>>({});

  // API Hooks
  const addIngredient = useAddIngredient();
  const updateIngredient = useUpdateIngredient();

  // 处理输入变化
  const handleChange = (name: keyof Ingredient, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));

    // 清除该字段的错误
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  // 处理输入框变化
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type } = e.target;

    if (type === 'number') {
      handleChange(name as keyof Ingredient, parseFloat(value) || 0);
    } else {
      handleChange(name as keyof Ingredient, value);
    }
  };

  // 表单验证
  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = '食材名称不能为空';
    }

    if (!formData.category.trim()) {
      newErrors.category = '分类不能为空';
    }

    if (!formData.unit.trim()) {
      newErrors.unit = '单位不能为空';
    }

    if (formData.quantity < 0) {
      newErrors.quantity = '数量不能为负数';
    }

    // 移除对expiry_date的验证
    // if (!formData.expiry_date) {
    //   newErrors.expiry_date = '过期日期不能为空';
    // }

    // 移除对location的验证
    // if (!formData.location.trim()) {
    //   newErrors.location = '存放位置不能为空';
    // }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // 提交表单
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    if (isEditMode) {
      updateIngredient.mutate(formData, {
        onSuccess: () => {
          onClose();
        },
      });
    } else {
      addIngredient.mutate(formData, {
        onSuccess: () => {
          onClose();
        },
      });
    }
  };

  const isLoading = addIngredient.isPending || updateIngredient.isPending;
  const error = addIngredient.error || updateIngredient.error;

  return (
    <form className="form-container" onSubmit={handleSubmit}>
      <div className="form-header">
        <h2 className="form-title">{isEditMode ? '编辑食材' : '添加食材'}</h2>
      </div>

      <div className="form-group">
        <label className="form-label">食材名称 *</label>
        <input
          className={`form-input ${errors.name ? 'form-input-error' : ''}`}
          type="text"
          name="name"
          value={formData.name}
          onChange={handleInputChange}
          placeholder="输入食材名称"
        />
        {errors.name && <div className="error-text">{errors.name}</div>}
      </div>

      <div className="form-group">
        <label className="form-label">分类 *</label>
        <input
          className={`form-input ${errors.category ? 'form-input-error' : ''}`}
          type="text"
          name="category"
          value={formData.category}
          onChange={handleInputChange}
          placeholder="输入分类，如肉类、蔬菜等"
        />
        {errors.category && <div className="error-text">{errors.category}</div>}
      </div>

      <div className="form-row">
        <div className="form-col">
          <label className="form-label">数量 *</label>
          <input
            className={`form-input ${errors.quantity ? 'form-input-error' : ''}`}
            type="number"
            name="quantity"
            value={formData.quantity}
            onChange={handleInputChange}
            placeholder="输入数量"
            step="0.01"
          />
          {errors.quantity && <div className="error-text">{errors.quantity}</div>}
        </div>

        <div className="form-col">
          <label className="form-label">单位 *</label>
          <input
            className={`form-input ${errors.unit ? 'form-input-error' : ''}`}
            type="text"
            name="unit"
            value={formData.unit}
            onChange={handleInputChange}
            placeholder="输入单位，如kg、个等"
          />
          {errors.unit && <div className="error-text">{errors.unit}</div>}
        </div>
      </div>

      {/* 移除过期日期字段
      <div className="form-group">
        <label className="form-label">过期日期 *</label>
        <input
          className={`form-input ${errors.expiry_date ? 'form-input-error' : ''}`}
          type="date"
          name="expiry_date"
          value={formData.expiry_date}
          onChange={handleInputChange}
        />
        {errors.expiry_date && <div className="error-text">{errors.expiry_date}</div>}
      </div>
      */}

      {/* 移除存放位置字段
      <div className="form-group">
        <label className="form-label">存放位置 *</label>
        <input
          className={`form-input ${errors.location ? 'form-input-error' : ''}`}
          type="text"
          name="location"
          value={formData.location}
          onChange={handleInputChange}
          placeholder="输入存放位置"
        />
        {errors.location && <div className="error-text">{errors.location}</div>}
      </div>
      */}

      <div className="form-group">
        <label className="form-label">状态</label>
        <div className="form-status-container">
          {['normal', 'expired', 'low', 'pending_check'].map(status => (
            <button
              type="button"
              key={status}
              className={`status-button ${formData.status === status ? 'status-selected' : ''}`}
              onClick={() => handleChange('status', status)}
            >
              {status === 'normal'
                ? '正常'
                : status === 'expired'
                  ? '已过期'
                  : status === 'low'
                    ? '库存不足'
                    : '待检查'}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="error-container">
          <div className="error-text">保存失败: {(error as Error).message}</div>
        </div>
      )}

      <div className="button-container">
        <button type="button" className="cancel-button" onClick={onClose} disabled={isLoading}>
          取消
        </button>

        <button
          type="submit"
          className={`submit-button ${isLoading ? 'disabled-button' : ''}`}
          disabled={isLoading}
        >
          {isLoading ? <span>处理中...</span> : isEditMode ? '保存修改' : '添加食材'}
        </button>
      </div>
    </form>
  );
};

export default IngredientForm;
