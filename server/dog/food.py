import torch
import torch.nn as nn
import torch.optim as optim
import numpy as np
import os
import json
import sqlite3
import datetime
from pathlib import Path


# 数据库管理器
class DBManager:
    def __init__(self, db_path="data/dog_data.db"):
        self.db_path = Path(db_path)
        self.db_path.parent.mkdir(exist_ok=True)
        self.conn = None
        self.connect()
        self.create_tables()
    
    def connect(self):
        """连接数据库"""
        try:
            self.conn = sqlite3.connect(self.db_path, check_same_thread=False)
            self.conn.row_factory = sqlite3.Row  # 返回字典形式的结果
            print(f"成功连接到数据库: {self.db_path}")
            return True
        except sqlite3.Error as e:
            print(f"数据库连接错误: {e}")
            return False
    
    def create_tables(self):
        """创建所有必要的表"""
        try:
            cursor = self.conn.cursor()
            
            # 1. 狗狗信息表
            cursor.execute('''
            CREATE TABLE IF NOT EXISTS dogs (
                dog_id TEXT PRIMARY KEY,
                breed INTEGER NOT NULL,
                age REAL NOT NULL,
                weight REAL NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
            ''')
            
            # 2. 喂食记录表
            cursor.execute('''
            CREATE TABLE IF NOT EXISTS feeding_records (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                dog_id TEXT NOT NULL,
                recommendation REAL NOT NULL,
                eaten_amount REAL NOT NULL,
                leftover_amount REAL NOT NULL,
                activity REAL NOT NULL,
                health REAL NOT NULL,
                timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (dog_id) REFERENCES dogs (dog_id)
            )
            ''')
            
            # 3. 温湿度记录表
            cursor.execute('''
            CREATE TABLE IF NOT EXISTS temperature_records (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                dog_id TEXT NOT NULL,
                temperature REAL NOT NULL,
                humidity REAL NOT NULL,
                timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (dog_id) REFERENCES dogs (dog_id)
            )
            ''')
            
            # 4. 运动记录表
            cursor.execute('''
            CREATE TABLE IF NOT EXISTS activity_records (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                dog_id TEXT NOT NULL,
                activity_type TEXT NOT NULL,
                duration REAL NOT NULL,
                intensity REAL NOT NULL,
                timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (dog_id) REFERENCES dogs (dog_id)
            )
            ''')
            
            # 5. 狗狗状态表 (存储当前喂食量等状态信息)
            cursor.execute('''
            CREATE TABLE IF NOT EXISTS dog_status (
                dog_id TEXT PRIMARY KEY,
                last_feeding REAL DEFAULT 0.1,
                leftover_food REAL DEFAULT 0.0,
                total_feedings INTEGER DEFAULT 0,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (dog_id) REFERENCES dogs (dog_id)
            )
            ''')
            
            self.conn.commit()
            print("数据库表创建成功")
            return True
        except sqlite3.Error as e:
            print(f"创建表结构错误: {e}")
            return False
    
    def execute(self, query, params=(), commit=True):
        """执行SQL查询"""
        if not self.conn:
            if not self.connect():
                return None
                
        try:
            cursor = self.conn.cursor()
            cursor.execute(query, params)
            
            if commit:
                self.conn.commit()
                
            return cursor
        except sqlite3.Error as e:
            print(f"SQL执行错误: {e}")
            print(f"查询: {query}")
            print(f"参数: {params}")
            return None
    
    def close(self):
        """关闭数据库连接"""
        if self.conn:
            self.conn.close()
            self.conn = None


# 1. 简化的模型定义
class SimpleFeedingModel(nn.Module):
    def __init__(self, num_breeds):
        super().__init__()
        # 品种嵌入层（简化，但保留）
        self.breed_embed = nn.Embedding(num_breeds, 8)
        
        # 简化的特征处理网络
        self.network = nn.Sequential(
            nn.Linear(8 + 5, 32),  # 品种嵌入 + 基本特征(年龄,体重,活动,健康,上次进食量)
            nn.ReLU(),
            nn.Linear(32, 16),
            nn.ReLU(),
            nn.Linear(16, 1)
        )

    def forward(self, inputs):
        # 提取品种特征
        breed_emb = self.breed_embed(inputs['breed'])
        if breed_emb.dim() == 1:
            breed_emb = breed_emb.unsqueeze(0)
            
        # 合并其他特征
        features = torch.cat([
            breed_emb, 
            inputs['features'].unsqueeze(0) if inputs['features'].dim() == 1 else inputs['features']
        ], dim=1)
        
        # 预测喂食量
        return self.network(features).squeeze()


# 2. 简化的狗狗档案类
class DogProfile:
    def __init__(self, breed, age, weight, db_manager=None, dog_id=None, last_feeding=0.1, leftover_food=0.0, total_feedings=0):
        self.breed = torch.tensor([breed], dtype=torch.long)
        self.age = float(age)
        self.weight = float(weight)
        self.last_feeding = last_feeding  # 默认初始喂食量
        self.leftover_food = leftover_food  # 剩余食物量
        self.total_feedings = total_feedings  # 喂食次数
        self.db_manager = db_manager
        self.dog_id = dog_id
    
    def get_features(self, activity, health):
        """获取简化的特征"""
        # 基本特征：年龄、体重、活动量、健康状况、上次喂食量
        features = torch.tensor(
            [self.age/15, self.weight/50, activity/12, health, self.last_feeding],
            dtype=torch.float32
        )
        
        return {
            'breed': self.breed,
            'features': features,
            'profile': self  # 保留引用用于更新历史
        }
    
    def update_feeding(self, recommendation, eaten_amount, leftover_amount):
        """记录喂食信息"""
        self.total_feedings += 1
        self.last_feeding = eaten_amount  # 实际食用量作为下次预测的参考
        self.leftover_food = leftover_amount
        
        # 更新数据库中的狗狗状态
        if self.db_manager and self.dog_id:
            self.db_manager.execute(
                "UPDATE dog_status SET last_feeding = ?, leftover_food = ?, total_feedings = ?, updated_at = CURRENT_TIMESTAMP WHERE dog_id = ?",
                (self.last_feeding, self.leftover_food, self.total_feedings, self.dog_id)
            )


# 3. 简化的学习器
class SimplelearningSystem:
    def __init__(self, num_breeds=100, model_path="models/simple_feeding_model.pth"):
        self.model = SimpleFeedingModel(num_breeds)
        self.optimizer = optim.Adam(self.model.parameters(), lr=0.001)
        self.criterion = nn.MSELoss()
        self.model_path = Path(model_path)
        self.model_path.parent.mkdir(exist_ok=True)
        
        # 尝试加载已有模型
        self.load_model()
    
    def save_model(self):
        """保存模型"""
        torch.save({
            'model_state_dict': self.model.state_dict(),
            'optimizer_state_dict': self.optimizer.state_dict()
        }, self.model_path)
        
    def load_model(self):
        """加载模型"""
        if self.model_path.exists():
            try:
                checkpoint = torch.load(self.model_path)
                self.model.load_state_dict(checkpoint['model_state_dict'])
                self.optimizer.load_state_dict(checkpoint['optimizer_state_dict'])
                print("模型加载成功")
                return True
            except Exception as e:
                print(f"加载模型失败: {e}")
        else:
            print("未找到预训练模型，将创建新模型")
        return False
    
    def update(self, features, actual_eaten):
        """更新模型"""
        self.model.train()
        
        # 转换目标为张量
        target = torch.tensor([actual_eaten], dtype=torch.float32)
        
        # 预测值
        prediction = self.model(features)
        if prediction.dim() == 0:
            prediction = prediction.unsqueeze(0)
            
        # 计算损失
        loss = self.criterion(prediction, target)
        
        # 反向传播
        self.optimizer.zero_grad()
        loss.backward()
        self.optimizer.step()
        
        return loss.item()


# 4. 使用SQLite的喂食系统
class FeedingSystem:
    def __init__(self, num_breeds=100, model_path="models/simple_feeding_model.pth", db_path="data/dog_data.db"):
        self.learner = SimplelearningSystem(num_breeds, model_path)
        self.profiles = {}  # 缓存狗狗档案
        self.min_feeding = 0.1  # 最小喂食量(kg)
        self.max_feeding = 2.0  # 最大喂食量(kg)
        
        # 创建数据库管理器
        self.db = DBManager(db_path)
        
        # 创建必要的目录
        Path("models").mkdir(exist_ok=True)
        
        # 加载现有狗狗数据到内存
        self.load_dogs()

    def register_dog(self, dog_id, breed, age, weight):
        """注册新狗狗"""
        try:
            # 检查狗狗是否已存在
            cursor = self.db.execute("SELECT * FROM dogs WHERE dog_id = ?", (dog_id,))
            existing_dog = cursor.fetchone()
            
            if existing_dog:
                # 更新现有狗狗信息
                self.db.execute(
                    "UPDATE dogs SET breed = ?, age = ?, weight = ?, updated_at = CURRENT_TIMESTAMP WHERE dog_id = ?",
                    (breed, age, weight, dog_id)
                )
                self.db.execute(
                    "UPDATE dog_status SET updated_at = CURRENT_TIMESTAMP WHERE dog_id = ?",
                    (dog_id,)
                )
                print(f"狗狗信息已更新: {dog_id}")
            else:
                # 插入新狗狗记录
                self.db.execute(
                    "INSERT INTO dogs (dog_id, breed, age, weight) VALUES (?, ?, ?, ?)",
                    (dog_id, breed, age, weight)
                )
                # 初始化狗狗状态
                self.db.execute(
                    "INSERT INTO dog_status (dog_id, last_feeding, leftover_food, total_feedings) VALUES (?, ?, ?, ?)",
                    (dog_id, 0.1, 0.0, 0)
                )
                print(f"新狗狗已注册: {dog_id}")
            
            # 更新内存缓存
            if dog_id in self.profiles:
                profile = self.profiles[dog_id]
                profile.breed = torch.tensor([breed], dtype=torch.long)
                profile.age = float(age)
                profile.weight = float(weight)
            else:
                # 获取狗狗状态
                cursor = self.db.execute("SELECT * FROM dog_status WHERE dog_id = ?", (dog_id,))
                status = cursor.fetchone()
                if status:
                    self.profiles[dog_id] = DogProfile(
                        breed=breed,
                        age=age,
                        weight=weight,
                        db_manager=self.db,
                        dog_id=dog_id,
                        last_feeding=status['last_feeding'],
                        leftover_food=status['leftover_food'],
                        total_feedings=status['total_feedings']
                    )
                else:
                    self.profiles[dog_id] = DogProfile(
                        breed=breed,
                        age=age,
                        weight=weight,
                        db_manager=self.db,
                        dog_id=dog_id
                    )
            
            return {
                "status": "success",
                "message": f"成功{'更新' if existing_dog else '注册'}狗狗: {dog_id}",
                "dog_id": dog_id
            }
        except Exception as e:
            print(f"注册狗狗失败: {e}")
            return {
                "status": "error",
                "message": f"注册狗狗失败: {str(e)}"
            }

    def recommend(self, dog_id, activity, health, consider_leftover=True):
        """基于当前状态推荐喂食量"""
        # 确保狗狗资料已加载
        if dog_id not in self.profiles:
            # 尝试从数据库加载
            profile = self.load_dog_profile(dog_id)
            if not profile:
                return {
                    "status": "error",
                    "message": f"未找到狗狗ID: {dog_id}"
                }
        
        profile = self.profiles[dog_id]
        features = profile.get_features(activity, health)
        
        self.learner.model.eval()  # 设置为评估模式
        with torch.no_grad():
            # 基础喂食推荐
            base_recommendation = self.learner.model(features).item()
            
            # 简单调整：根据体重比例，如果模型不准，提供合理默认值
            if base_recommendation < 0.01 or np.isnan(base_recommendation):
                # 根据体重的简单公式 (约2-3%的体重)
                base_recommendation = profile.weight * 0.025
            
            # 考虑剩余食物
            final_recommendation = base_recommendation
            if consider_leftover and profile.leftover_food > 0:
                final_recommendation = max(0, base_recommendation - profile.leftover_food)
                
            # 确保在合理范围内
            final_recommendation = max(self.min_feeding, min(self.max_feeding, final_recommendation))
            
            return {
                "status": "success",
                "recommendation": round(final_recommendation, 2),
                "leftover": round(profile.leftover_food, 2)
            }

    def record_feeding(self, dog_id, recommendation, eaten_amount, leftover_amount, activity, health):
        """记录实际喂食数据并更新模型"""
        # 确保狗狗资料已加载
        if dog_id not in self.profiles:
            # 尝试从数据库加载
            profile = self.load_dog_profile(dog_id)
            if not profile:
                return {
                    "status": "error",
                    "message": f"未找到狗狗ID: {dog_id}"
                }
        
        profile = self.profiles[dog_id]
        
        try:
            # 1. 更新狗狗档案
            profile.update_feeding(recommendation, eaten_amount, leftover_amount)
            
            # 2. 记录喂食数据到数据库
            self.db.execute(
                "INSERT INTO feeding_records (dog_id, recommendation, eaten_amount, leftover_amount, activity, health) VALUES (?, ?, ?, ?, ?, ?)",
                (dog_id, recommendation, eaten_amount, leftover_amount, activity, health)
            )
            
            # 3. 获取特征并更新模型
            features = profile.get_features(activity, health)
            loss = self.learner.update(features, eaten_amount)
            
            # 4. 保存模型
            self.learner.save_model()
            
            return {
                "status": "success",
                "message": "已记录喂食数据",
                "dog_id": dog_id,
                "consumed": round(eaten_amount, 2),
                "leftover": round(leftover_amount, 2),
                "loss": round(loss, 4)
            }
        except Exception as e:
            print(f"记录喂食数据失败: {e}")
            return {
                "status": "error",
                "message": f"记录喂食数据失败: {str(e)}"
            }

    def record_temperature(self, dog_id, temperature, humidity):
        """记录温湿度数据"""
        if dog_id not in self.profiles:
            # 尝试从数据库加载
            profile = self.load_dog_profile(dog_id)
            if not profile:
                return {
                    "status": "error",
                    "message": f"未找到狗狗ID: {dog_id}"
                }
        
        try:
            # 记录温湿度数据
            self.db.execute(
                "INSERT INTO temperature_records (dog_id, temperature, humidity) VALUES (?, ?, ?)",
                (dog_id, temperature, humidity)
            )
            
            return {
                "status": "success",
                "message": "温湿度数据已记录",
                "dog_id": dog_id,
                "temperature": temperature,
                "humidity": humidity,
                "timestamp": datetime.datetime.now().isoformat()
            }
        except Exception as e:
            print(f"记录温湿度数据失败: {e}")
            return {
                "status": "error",
                "message": f"记录温湿度数据失败: {str(e)}"
            }

    def record_activity(self, dog_id, activity_type, duration, intensity):
        """记录运动数据"""
        if dog_id not in self.profiles:
            # 尝试从数据库加载
            profile = self.load_dog_profile(dog_id)
            if not profile:
                return {
                    "status": "error",
                    "message": f"未找到狗狗ID: {dog_id}"
                }
        
        try:
            # 记录运动数据
            self.db.execute(
                "INSERT INTO activity_records (dog_id, activity_type, duration, intensity) VALUES (?, ?, ?, ?)",
                (dog_id, activity_type, duration, intensity)
            )
            
            return {
                "status": "success",
                "message": "运动数据已记录",
                "dog_id": dog_id,
                "activity_type": activity_type,
                "duration": duration,
                "intensity": intensity,
                "timestamp": datetime.datetime.now().isoformat()
            }
        except Exception as e:
            print(f"记录运动数据失败: {e}")
            return {
                "status": "error",
                "message": f"记录运动数据失败: {str(e)}"
            }

    def load_dogs(self):
        """从数据库加载所有狗狗信息到内存"""
        try:
            cursor = self.db.execute("SELECT * FROM dogs")
            dogs = cursor.fetchall()
            
            for dog in dogs:
                dog_id = dog['dog_id']
                self.load_dog_profile(dog_id)
                
            print(f"成功加载 {len(self.profiles)} 条狗狗资料")
        except Exception as e:
            print(f"加载狗狗资料失败: {e}")

    def load_dog_profile(self, dog_id):
        """从数据库加载特定狗狗资料"""
        try:
            # 查询狗狗基本信息
            cursor = self.db.execute("SELECT * FROM dogs WHERE dog_id = ?", (dog_id,))
            dog = cursor.fetchone()
            
            if not dog:
                print(f"未找到狗狗: {dog_id}")
                return None
                
            # 查询狗狗状态
            cursor = self.db.execute("SELECT * FROM dog_status WHERE dog_id = ?", (dog_id,))
            status = cursor.fetchone()
            
            if not status:
                # 创建默认状态
                self.db.execute(
                    "INSERT INTO dog_status (dog_id, last_feeding, leftover_food, total_feedings) VALUES (?, ?, ?, ?)",
                    (dog_id, 0.1, 0.0, 0)
                )
                status = {
                    'last_feeding': 0.1,
                    'leftover_food': 0.0,
                    'total_feedings': 0
                }
            
            # 创建档案对象
            self.profiles[dog_id] = DogProfile(
                breed=dog['breed'],
                age=dog['age'],
                weight=dog['weight'],
                db_manager=self.db,
                dog_id=dog_id,
                last_feeding=status['last_feeding'],
                leftover_food=status['leftover_food'],
                total_feedings=status['total_feedings']
            )
            
            return self.profiles[dog_id]
        except Exception as e:
            print(f"加载狗狗档案失败: {e}")
            return None

    def get_dog_profile(self, dog_id):
        """获取狗狗档案信息"""
        # 确保狗狗资料已加载
        if dog_id not in self.profiles:
            # 尝试从数据库加载
            profile = self.load_dog_profile(dog_id)
            if not profile:
                return {
                    "status": "error",
                    "message": f"未找到狗狗ID: {dog_id}"
                }
        
        profile = self.profiles[dog_id]
        return {
            "status": "success",
            "dog_id": dog_id,
            "breed": profile.breed.item(),
            "age": profile.age,
            "weight": profile.weight,
            "total_feedings": profile.total_feedings,
            "last_feeding": round(profile.last_feeding, 2),
            "leftover_food": round(profile.leftover_food, 2)
        }

    def update_dog_profile(self, dog_id, age=None, weight=None):
        """更新狗狗的基本信息"""
        # 确保狗狗资料已加载
        if dog_id not in self.profiles:
            # 尝试从数据库加载
            profile = self.load_dog_profile(dog_id)
            if not profile:
                return {
                    "status": "error",
                    "message": f"未找到狗狗ID: {dog_id}"
                }
        
        profile = self.profiles[dog_id]
        
        # 准备更新数据
        update_fields = []
        update_values = []
        
        if age is not None:
            profile.age = float(age)
            update_fields.append("age = ?")
            update_values.append(float(age))
        
        if weight is not None:
            profile.weight = float(weight)
            update_fields.append("weight = ?")
            update_values.append(float(weight))
        
        if update_fields:
            # 添加更新时间
            update_fields.append("updated_at = CURRENT_TIMESTAMP")
            
            # 更新数据库
            update_query = f"UPDATE dogs SET {', '.join(update_fields)} WHERE dog_id = ?"
            update_values.append(dog_id)
            
            self.db.execute(update_query, tuple(update_values))
            
            return {
                "status": "success",
                "message": "狗狗资料已更新",
                "dog_id": dog_id,
                "age": profile.age,
                "weight": profile.weight
            }
        else:
            return {
                "status": "error",
                "message": "未提供任何更新数据"
            }
        
    def get_all_dogs(self):
        """获取所有狗狗的基本信息列表"""
        try:
            cursor = self.db.execute("SELECT * FROM dogs")
            dogs = cursor.fetchall()
            
            dogs_list = []
            for dog in dogs:
                dogs_list.append({
                    "dog_id": dog['dog_id'],
                    "breed": dog['breed'],
                    "age": dog['age'],
                    "weight": dog['weight']
                })
                
            return {
                "status": "success",
                "count": len(dogs_list),
                "dogs": dogs_list
            }
        except Exception as e:
            print(f"获取所有狗狗列表失败: {e}")
            return {
                "status": "error",
                "message": f"获取所有狗狗列表失败: {str(e)}"
            }
    
    def get_feeding_history(self, dog_id, limit=10):
        """获取狗狗的喂食历史记录"""
        try:
            cursor = self.db.execute(
                "SELECT * FROM feeding_records WHERE dog_id = ? ORDER BY timestamp DESC LIMIT ?",
                (dog_id, limit)
            )
            records = cursor.fetchall()
            
            history = []
            for record in records:
                history.append({
                    "id": record['id'],
                    "recommendation": record['recommendation'],
                    "eaten_amount": record['eaten_amount'],
                    "leftover_amount": record['leftover_amount'],
                    "activity": record['activity'],
                    "health": record['health'],
                    "timestamp": record['timestamp']
                })
                
            return {
                "status": "success",
                "dog_id": dog_id,
                "count": len(history),
                "history": history
            }
        except Exception as e:
            print(f"获取喂食历史失败: {e}")
            return {
                "status": "error",
                "message": f"获取喂食历史失败: {str(e)}"
            }
    
    def get_temperature_history(self, dog_id, limit=10):
        """获取狗狗的温湿度历史记录"""
        try:
            cursor = self.db.execute(
                "SELECT * FROM temperature_records WHERE dog_id = ? ORDER BY timestamp DESC LIMIT ?",
                (dog_id, limit)
            )
            records = cursor.fetchall()
            
            history = []
            for record in records:
                history.append({
                    "id": record['id'],
                    "temperature": record['temperature'],
                    "humidity": record['humidity'],
                    "timestamp": record['timestamp']
                })
                
            return {
                "status": "success",
                "dog_id": dog_id,
                "count": len(history),
                "history": history
            }
        except Exception as e:
            print(f"获取温湿度历史失败: {e}")
            return {
                "status": "error",
                "message": f"获取温湿度历史失败: {str(e)}"
            }
    
    def get_activity_history(self, dog_id, limit=10):
        """获取狗狗的运动历史记录"""
        try:
            cursor = self.db.execute(
                "SELECT * FROM activity_records WHERE dog_id = ? ORDER BY timestamp DESC LIMIT ?",
                (dog_id, limit)
            )
            records = cursor.fetchall()
            
            history = []
            for record in records:
                history.append({
                    "id": record['id'],
                    "activity_type": record['activity_type'],
                    "duration": record['duration'],
                    "intensity": record['intensity'],
                    "timestamp": record['timestamp']
                })
                
            return {
                "status": "success",
                "dog_id": dog_id,
                "count": len(history),
                "history": history
            }
        except Exception as e:
            print(f"获取运动历史失败: {e}")
            return {
                "status": "error",
                "message": f"获取运动历史失败: {str(e)}"
            }
    
    def cleanup(self):
        """清理资源"""
        if self.db:
            self.db.close()


# 仅供API调用，不再包含模拟训练代码
if __name__ == "__main__":
    print("狗狗喂食推荐系统已启动，等待API调用")
    print("请勿直接运行此文件，应当通过api.py提供的Web接口使用本系统")