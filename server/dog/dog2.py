import os
import torch
import multiprocessing
import sqlite3
import datetime
from pathlib import Path
from torch import nn
from PIL import Image
from torchvision import datasets, transforms, models
from torch.utils.data import DataLoader
from timeit import default_timer as timer
# 设备自动选择
device = torch.device("cuda" if torch.cuda.is_available() else "mps" if torch.backends.mps.is_available() else "cpu")


# --------------- SQLite数据库管理 ---------------
class DogDB:
    _instance = None
    
    def __init__(self, db_path="data/dog_classifier.db"):
        """初始化数据库连接和表结构"""
        self.db_path = Path(db_path)
        self.db_path.parent.mkdir(exist_ok=True)
        self.conn = None
        self.connect()
        self.create_tables()
    
    @classmethod
    def get_instance(cls, db_path="data/dog_classifier.db"):
        """单例模式获取数据库实例"""
        if cls._instance is None:
            cls._instance = cls(db_path)
        return cls._instance
    
    def connect(self):
        """连接到SQLite数据库"""
        try:
            self.conn = sqlite3.connect(self.db_path, check_same_thread=False)
            self.conn.row_factory = sqlite3.Row  # 返回字典形式的结果
            print(f"成功连接到数据库: {self.db_path}")
            return True
        except sqlite3.Error as e:
            print(f"数据库连接错误: {e}")
            return False
    
    def create_tables(self):
        """创建必要的表结构"""
        try:
            cursor = self.conn.cursor()
            
            # 模型信息表
            cursor.execute('''
            CREATE TABLE IF NOT EXISTS models (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                model_name TEXT NOT NULL,
                num_classes INTEGER NOT NULL,
                accuracy REAL NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                last_used TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
            ''')
            
            # 类别名称表
            cursor.execute('''
            CREATE TABLE IF NOT EXISTS class_names (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                model_id INTEGER NOT NULL,
                class_id INTEGER NOT NULL,
                class_name TEXT NOT NULL,
                FOREIGN KEY (model_id) REFERENCES models (id)
            )
            ''')
            
            # 预测历史记录表
            cursor.execute('''
            CREATE TABLE IF NOT EXISTS prediction_history (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                image_path TEXT NOT NULL,
                prediction TEXT NOT NULL,
                confidence REAL NOT NULL,
                timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
            ''')
            
            # 训练记录表
            cursor.execute('''
            CREATE TABLE IF NOT EXISTS training_records (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                model_id INTEGER NOT NULL,
                epoch INTEGER NOT NULL,
                train_loss REAL NOT NULL,
                train_accuracy REAL NOT NULL,
                test_accuracy REAL NOT NULL,
                timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (model_id) REFERENCES models (id)
            )
            ''')
            
            self.conn.commit()
            print("数据库表结构创建成功")
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
    
    def save_model_info(self, model_name, num_classes, accuracy, class_names):
        """保存模型信息到数据库"""
        try:
            # 插入或更新模型信息
            cursor = self.execute(
                "INSERT INTO models (model_name, num_classes, accuracy) VALUES (?, ?, ?)",
                (model_name, num_classes, accuracy)
            )
            model_id = cursor.lastrowid
            
            # 插入类别名称
            for i, class_name in enumerate(class_names):
                self.execute(
                    "INSERT INTO class_names (model_id, class_id, class_name) VALUES (?, ?, ?)",
                    (model_id, i, class_name)
                )
            
            print(f"模型信息已保存到数据库, ID: {model_id}")
            return model_id
        except Exception as e:
            print(f"保存模型信息失败: {e}")
            return None
    
    def save_prediction(self, image_path, prediction, confidence):
        """保存预测记录"""
        try:
            self.execute(
                "INSERT INTO prediction_history (image_path, prediction, confidence) VALUES (?, ?, ?)",
                (str(image_path), prediction, confidence)
            )
            return True
        except Exception as e:
            print(f"保存预测记录失败: {e}")
            return False
    
    def save_training_record(self, model_id, epoch, train_loss, train_accuracy, test_accuracy):
        """保存训练记录"""
        try:
            self.execute(
                "INSERT INTO training_records (model_id, epoch, train_loss, train_accuracy, test_accuracy) VALUES (?, ?, ?, ?, ?)",
                (model_id, epoch, train_loss, train_accuracy, test_accuracy)
            )
            return True
        except Exception as e:
            print(f"保存训练记录失败: {e}")
            return False
            
    def get_prediction_history(self, limit=10):
        """获取最近的预测历史"""
        try:
            cursor = self.execute(
                "SELECT * FROM prediction_history ORDER BY timestamp DESC LIMIT ?",
                (limit,)
            )
            return [dict(row) for row in cursor.fetchall()]
        except Exception as e:
            print(f"获取预测历史失败: {e}")
            return []
    
    def get_class_names(self, model_id):
        """从数据库获取类别名称"""
        try:
            cursor = self.execute(
                "SELECT class_id, class_name FROM class_names WHERE model_id = ? ORDER BY class_id",
                (model_id,)
            )
            return [row['class_name'] for row in cursor.fetchall()]
        except Exception as e:
            print(f"获取类别名称失败: {e}")
            return []
    
    def get_latest_model_id(self):
        """获取最新的模型ID"""
        try:
            cursor = self.execute("SELECT id FROM models ORDER BY created_at DESC LIMIT 1")
            result = cursor.fetchone()
            return result['id'] if result else None
        except Exception as e:
            print(f"获取最新模型ID失败: {e}")
            return None
    
    def update_model_usage(self, model_id):
        """更新模型最后使用时间"""
        try:
            self.execute(
                "UPDATE models SET last_used = CURRENT_TIMESTAMP WHERE id = ?",
                (model_id,)
            )
            return True
        except Exception as e:
            print(f"更新模型使用时间失败: {e}")
            return False
            
    def close(self):
        """关闭数据库连接"""
        if self.conn:
            self.conn.close()
            self.conn = None


# --------------- 模型定义 ---------------
class DogClassifierModel(nn.Module):
    def __init__(self, num_classes):
        super().__init__()
        # 加载预训练的ResNet18
        self.resnet = models.resnet18(pretrained=True)
        
        # 冻结大部分层
        for param in list(self.resnet.parameters())[:-4]:
            param.requires_grad = False
            
        # 修改最后的全连接层
        num_features = self.resnet.fc.in_features
        self.resnet.fc = nn.Sequential(
            nn.Linear(num_features, 512),
            nn.ReLU(),
            nn.Dropout(0.5),
            nn.Linear(512, num_classes)
        )

    def forward(self, x):
        return self.resnet(x)

# --------------- 训练功能 ---------------
def calculate_accuracy(model, data_loader, device):
    model.eval()
    correct = 0
    total = 0
    with torch.no_grad():
        for images, labels in data_loader:
            images, labels = images.to(device), labels.to(device)
            outputs = model(images)
            _, predicted = torch.max(outputs.data, 1)
            total += labels.size(0)
            correct += (predicted == labels).sum().item()
    return correct / total

def train():
    """训练入口函数"""
    data_path = Path("data/god")
    model_path = Path("models/resnet18_dog_classifier.pth")

    # 数据加载和增强
    train_transform = transforms.Compose([
        transforms.Resize((224, 224)),  # ResNet需要224x224的输入
        transforms.RandomHorizontalFlip(p=0.5),
        transforms.RandomRotation(15),
        transforms.RandomResizedCrop(224, scale=(0.85, 1.0)),
        transforms.ColorJitter(brightness=0.2, contrast=0.2, saturation=0.2, hue=0.1),
        transforms.RandomAffine(degrees=0, translate=(0.1, 0.1)),
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
    ])

    test_transform = transforms.Compose([
        transforms.Resize((224, 224)),
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
    ])

    # 加载数据集
    train_data = datasets.ImageFolder(root=data_path / "train", transform=train_transform)
    test_data = datasets.ImageFolder(root=data_path / "test", transform=test_transform)

    # 保存类别名称到文件（传统方式）
    model_path.parent.mkdir(exist_ok=True)
    with open(model_path.parent / "class_names.txt", "w", encoding='utf-8') as f:
        f.write("\n".join(train_data.classes))

    # 创建数据加载器
    train_loader = DataLoader(
        train_data,
        batch_size=16,  # 较小的batch_size
        shuffle=True,
        num_workers=2,
        pin_memory=True
    )

    test_loader = DataLoader(
        test_data,
        batch_size=16,
        shuffle=False,
        num_workers=2,
        pin_memory=True
    )

    # 初始化模型
    model = DogClassifierModel(len(train_data.classes)).to(device)
    
    # 使用不同的学习率
    params_to_update = []
    params_to_update_names = []
    
    for name, param in model.named_parameters():
        if param.requires_grad:
            params_to_update.append(param)
            params_to_update_names.append(name)

    # 优化器和学习率调度
    optimizer = torch.optim.AdamW(params_to_update, lr=0.001, weight_decay=0.01)
    scheduler = torch.optim.lr_scheduler.ReduceLROnPlateau(
        optimizer, mode='max', factor=0.1, patience=3, verbose=True
    )
    loss_fn = nn.CrossEntropyLoss()

    # 初始化数据库
    db = DogDB.get_instance()
    
    # 训练循环
    best_test_acc = 0.0
    patience = 7  # 早停耐心值
    patience_counter = 0
    
    print("🚀 开始训练...")
    print(f"训练集样本数: {len(train_data)} | 测试集样本数: {len(test_data)}")
    print("-" * 60)

    for epoch in range(50):
        model.train()
        running_loss = 0.0
        correct = 0
        total = 0

        # 训练阶段
        for images, labels in train_loader:
            images, labels = images.to(device), labels.to(device)

            optimizer.zero_grad()
            outputs = model(images)
            loss = loss_fn(outputs, labels)
            loss.backward()
            
            # 梯度裁剪
            torch.nn.utils.clip_grad_norm_(model.parameters(), max_norm=1.0)
            
            optimizer.step()

            running_loss += loss.item() * images.size(0)
            _, predicted = torch.max(outputs.data, 1)
            total += labels.size(0)
            correct += (predicted == labels).sum().item()

        # 计算训练指标
        epoch_loss = running_loss / len(train_loader.dataset)
        train_acc = correct / total

        # 评估阶段
        test_acc = calculate_accuracy(model, test_loader, device)
        
        # 学习率调整
        scheduler.step(test_acc)
        
        # 保存训练记录到数据库
        model_id = db.get_latest_model_id()
        if not model_id:
            # 首次创建模型记录
            model_id = db.save_model_info(
                model_name="resnet18_dog_classifier",
                num_classes=len(train_data.classes),
                accuracy=test_acc,
                class_names=train_data.classes
            )
        
        # 保存当前轮次的训练记录
        db.save_training_record(
            model_id=model_id,
            epoch=epoch + 1,
            train_loss=epoch_loss,
            train_accuracy=train_acc,
            test_accuracy=test_acc
        )

        # 保存最佳模型
        if test_acc > best_test_acc:
            best_test_acc = test_acc
            torch.save(model.state_dict(), model_path)
            patience_counter = 0
            
            # 更新数据库中的模型准确率
            db.execute(
                "UPDATE models SET accuracy = ? WHERE id = ?",
                (best_test_acc, model_id)
            )
        else:
            patience_counter += 1

        # 打印训练信息
        print(f"Epoch {epoch + 1}/50")
        print(f"训练损失: {epoch_loss:.4f} | 训练准确率: {train_acc * 100:.2f}%")
        print(f"测试准确率: {test_acc * 100:.2f}%")
        print("-" * 60)

        # 早停检查
        if patience_counter >= patience:
            print("准确率已经停止提升，提前结束训练。")
            break

    print(f"✅ 训练完成，最佳测试准确率：{best_test_acc * 100:.2f}%")


# --------------- 预测功能（API专用）---------------
class DogClassifier:
    _instance = None

    def __init__(self):
        self.model = None
        self.class_names = []
        self.db = DogDB.get_instance()
        self.load_model()

    @classmethod
    def get_instance(cls):
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance

    def load_model(self):
        """加载训练好的模型"""
        model_path = Path("models/resnet18_dog_classifier.pth")
        if not model_path.exists():
            raise FileNotFoundError("请先运行训练生成模型文件")

        # 优先从文件加载类别名称（兼容传统方式）
        class_names_file = model_path.parent / "class_names.txt"
        if class_names_file.exists():
            with open(class_names_file, encoding='utf-8') as f:
                self.class_names = f.read().splitlines()
        else:
            # 尝试从数据库加载
            model_id = self.db.get_latest_model_id()
            if model_id:
                self.class_names = self.db.get_class_names(model_id)
                if not self.class_names:
                    raise ValueError("无法从数据库加载类别名称")
            else:
                raise ValueError("无法找到模型信息")

        self.model = DogClassifierModel(len(self.class_names)).to(device)
        self.model.load_state_dict(torch.load(model_path, map_location=device))
        self.model.eval()
        
        # 更新模型使用时间
        model_id = self.db.get_latest_model_id()
        if model_id:
            self.db.update_model_usage(model_id)

    def predict(self, image_path: str) -> dict:
        """执行单张图片预测"""
        try:
            image = Image.open(image_path).convert("RGB")
            transform = transforms.Compose([
                transforms.Resize((224, 224)),
                transforms.ToTensor(),
                transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225])
            ])
            tensor = transform(image).unsqueeze(0).to(device)

            with torch.no_grad():
                preds = torch.nn.functional.softmax(self.model(tensor), dim=1)

            conf, idx = torch.max(preds, dim=1)
            prediction = self.class_names[idx.item()]
            confidence = round(conf.item(), 4)
            
            # 保存预测结果到数据库
            self.db.save_prediction(image_path, prediction, confidence)
            
            return {
                "class": prediction,
                "confidence": confidence,
                "status": "success"
            }
        except Exception as e:
            return {
                "error": str(e),
                "status": "error"
            }
    
    def get_prediction_history(self, limit=10):
        """获取预测历史记录"""
        return self.db.get_prediction_history(limit)


# --------------- 主程序入口 ---------------
if __name__ == "__main__":
    multiprocessing.freeze_support()
    
    # 确保数据目录存在
    Path("data").mkdir(exist_ok=True)
    Path("models").mkdir(exist_ok=True)

    # 自动训练逻辑
    if not Path("models/resnet18_dog_classifier.pth").exists():
        print("🚀 检测到未训练模型，开始训练...")
        start_time = timer()
        train()
        end_time = timer()
        print(f"总训练时间：{end_time-start_time:.2f}秒")
    else:
        print("✅ 模型已存在，跳过训练")

    # 初始化数据库（如果还未初始化）
    db = DogDB.get_instance()
    
    # 示例预测
    classifier = DogClassifier.get_instance()
    
    # 如果有myq.jpg文件，进行预测测试
    test_image = Path("data/myq.jpg")
    if test_image.exists():
        result = classifier.predict(str(test_image))
        print("测试预测结果:", result)
        
        # 显示最近的预测历史
        history = classifier.get_prediction_history(5)
        if history:
            print("\n最近5条预测历史:")
            for record in history:
                print(f"- {record['prediction']} (置信度: {record['confidence']}) - {record['timestamp']}")
    
    # 关闭数据库连接
    db.close()






