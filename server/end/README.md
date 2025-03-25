# Dog Server API

这是一个使用Django和Django REST Framework构建的用户注册登录API。

## 功能

- 用户注册 (支持使用邮箱作为主要标识)
- 用户登录 (使用邮箱和密码)
- 获取用户详情 (无需验证)
- Swagger API文档

## 安装和设置

1. 安装依赖：
```
py -m pip install -r requirements.txt
```

2. 运行迁移：
```
py manage.py migrate
```

3. 创建超级用户（可选）：
```
py manage.py createsuperuser
```

4. 启动服务器：
```
py manage.py runserver
```

## API端点

- 注册: `/api/register/`
- 登录: `/api/login/`
- 用户详情: `/api/user/<id>/`

## Swagger文档

- Swagger UI: `/swagger/`
- ReDoc UI: `/redoc/`
- OpenAPI JSON: `/swagger.json`
- OpenAPI YAML: `/swagger.yaml`

## 注册请求示例

```json
POST /api/register/
{
  "email": "test@example.com",
  "password": "yourpassword",
  "password2": "yourpassword",
  "first_name": "Test",
  "last_name": "User"
}
```

> 注：用户名字段是可选的，如果未提供，系统将使用邮箱前缀作为用户名。

## 登录请求示例

```json
POST /api/login/
{
  "email": "test@example.com",
  "password": "yourpassword"
}
```

## 特性和变更

1. **邮箱登录**：现在用户可以使用邮箱和密码进行登录，而不是用户名。
2. **自动用户名生成**：如果用户注册时未提供用户名，系统会自动使用邮箱前缀作为用户名。
3. **无需身份验证**：所有API端点不再需要身份验证，便于客户端开发和测试。
4. **邮箱唯一性验证**：系统会检查邮箱地址的唯一性，以防重复注册。
5. **Token身份验证**：注册和登录后都会返回身份验证token，前端可以使用这个token进行API调用。

## Token认证使用说明

注册和登录成功后，服务器将返回一个token，客户端应保存此token并在后续请求中使用。

### 注册响应示例

```json
{
  "user": {
    "id": 1,
    "username": "testuser",
    "email": "test@example.com",
    "first_name": "",
    "last_name": ""
  },
  "token": "9944b09199c62bcf9418ad846dd0e4bbdfc6ee4b",
  "message": "注册成功"
}
```

### 登录响应示例

```json
{
  "user": {
    "id": 1,
    "username": "testuser",
    "email": "test@example.com",
    "first_name": "",
    "last_name": ""
  },
  "token": "9944b09199c62bcf9418ad846dd0e4bbdfc6ee4b",
  "message": "登录成功"
}
```

### 在API请求中使用Token

在需要认证的API请求中，需要在HTTP请求头中添加Token：

```
Authorization: Token 9944b09199c62bcf9418ad846dd0e4bbdfc6ee4b
```

在前端代码中使用axios示例：

```javascript
import axios from 'axios';

// 设置请求拦截器添加token
axios.interceptors.request.use(
  config => {
    const token = localStorage.getItem('auth_token');
    if (token) {
      config.headers.Authorization = `Token ${token}`;
    }
    return config;
  },
  error => {
    return Promise.reject(error);
  }
);
```

在React Native中使用AsyncStorage存储token：

```javascript
import AsyncStorage from '@react-native-async-storage/async-storage';

// 保存token
const saveToken = async (token) => {
  try {
    await AsyncStorage.setItem('auth_token', token);
  } catch (error) {
    console.error('保存token失败:', error);
  }
};

// 获取token
const getToken = async () => {
  try {
    return await AsyncStorage.getItem('auth_token');
  } catch (error) {
    console.error('获取token失败:', error);
    return null;
  }
};
``` 