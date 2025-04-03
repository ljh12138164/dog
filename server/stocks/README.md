# 仓库管理系统

基于Django开发的仓库管理系统后端，使用SQLite数据库，实现了基于RBAC（Role-Based Access Control）的用户权限框架。

## 功能特性

- 基于Django和Django REST Framework开发
- 使用SQLite作为数据库
- 实现基于RBAC的用户权限系统
- RESTful API设计
- 完整的用户认证和授权功能
- 可视化API文档（Swagger/ReDoc）

## 技术栈

- Python 3.10+
- Django 5.0+
- Django REST Framework 3.14+
- drf-yasg (用于Swagger/ReDoc API文档)
- SQLite

## 快速开始

### 1. 安装依赖

```bash
pip install -r requirements.txt
```

### 2. 数据库迁移

```bash
py manage.py migrate
```

### 3. 创建超级用户

```bash
py manage.py create_superuser --username=admin --email=admin@example.com --password=admin123
```

### 4. 初始化角色和权限

```bash
py manage.py init_roles
```

### 5. 启动开发服务器

```bash
py manage.py runserver
```

现在，您可以访问以下地址：

- 管理后台: http://127.0.0.1:8100/admin （用户名：admin，密码：admin123）
- Swagger API文档: http://127.0.0.1:8100/swagger/
- ReDoc API文档: http://127.0.0.1:8100/redoc/
- DRF API文档: http://127.0.0.1:8100/docs/

## API接口

### 用户相关接口

- `GET /api/users/` - 获取用户列表
- `POST /api/users/` - 创建新用户
- `GET /api/users/{id}/` - 获取特定用户信息
- `PUT /api/users/{id}/` - 更新用户信息
- `DELETE /api/users/{id}/` - 删除用户
- `GET /api/users/me/` - 获取当前登录用户信息
- `POST /api/users/{id}/assign_role/` - 为用户分配角色
- `POST /api/users/{id}/remove_role/` - 移除用户的角色

### 角色相关接口

- `GET /api/roles/` - 获取角色列表
- `POST /api/roles/` - 创建新角色
- `GET /api/roles/{id}/` - 获取特定角色信息
- `PUT /api/roles/{id}/` - 更新角色信息
- `DELETE /api/roles/{id}/` - 删除角色
- `POST /api/roles/{id}/add_permission/` - 为角色添加权限
- `POST /api/roles/{id}/remove_permission/` - 从角色中移除权限

### 权限相关接口

- `GET /api/permissions/` - 获取权限列表
- `GET /api/permissions/{id}/` - 获取特定权限信息

## API文档

系统提供三种API文档查看方式：

1. **Swagger UI**: 访问 http://127.0.0.1:8100/swagger/ 以交互式方式浏览和测试API
2. **ReDoc**: 访问 http://127.0.0.1:8100/redoc/ 查看更美观的API文档
3. **DRF文档**: 访问 http://127.0.0.1:8100/docs/ 查看Django REST Framework原生文档

## 开发扩展

要添加新的应用模块，请执行以下步骤：

1. 创建新的Django应用
   ```bash
   py manage.py startapp app_name
   ```

2. 在`settings.py`中注册应用
   ```python
   INSTALLED_APPS = [
       # ...
       'app_name',
   ]
   ```

3. 定义模型、视图、URL等
4. 执行数据库迁移
   ```bash
   py manage.py makemigrations
   py manage.py migrate
   ```

5. 使用swagger_auto_schema装饰器为API添加文档
   ```python
   from drf_yasg.utils import swagger_auto_schema
   
   @swagger_auto_schema(
       operation_summary="操作摘要",
       operation_description="详细描述"
   )
   def your_view_method(self, request):
       pass
   ``` 