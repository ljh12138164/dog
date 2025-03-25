import os
import torch
from torch import nn
from PIL import Image
from torchvision import models, transforms
from pathlib import Path
from django.conf import settings
from .models import ClassifierModel, ClassNames, PredictionHistory

# 设备自动选择
device = torch.device("cuda" if torch.cuda.is_available() else "mps" if torch.backends.mps.is_available() else "cpu")

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

class DogClassifier:
    _instance = None

    def __init__(self):
        self.model = None
        self.class_names = []
        self.load_model()

    @classmethod
    def get_instance(cls):
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance

    def load_model(self):
        """加载训练好的模型"""
        # 使用环境变量设置的项目根目录
        project_root = Path(settings.BASE_DIR)
        model_path = project_root / "models" / "resnet18_dog_classifier.pth"
        
        if not model_path.exists():
            model_path = project_root / "models" / "dog_feeding_model.pth"
            if not model_path.exists():
                raise FileNotFoundError("找不到模型文件")
        
        # 优先从数据库加载类别名称
        db_model = ClassifierModel.objects.order_by('-last_used').first()
        if db_model:
            class_names_objs = ClassNames.objects.filter(model=db_model).order_by('class_id')
            if class_names_objs.exists():
                self.class_names = [cls_obj.class_name for cls_obj in class_names_objs]
                db_model.save()  # 更新最后使用时间
        
        # 如果数据库中没有类别名称，则从文件加载
        if not self.class_names:
            class_names_file = project_root / "models" / "class_names.txt"
            if class_names_file.exists():
                with open(class_names_file, encoding='utf-8') as f:
                    self.class_names = f.read().splitlines()
            else:
                raise ValueError("无法加载类别名称")
        
        # 加载模型
        self.model = DogClassifierModel(len(self.class_names)).to(device)
        self.model.load_state_dict(torch.load(model_path, map_location=device))
        self.model.eval()

    def predict(self, image_path):
        """执行单张图片预测"""
        try:
            # 如果image_path是图片文件对象而不是字符串路径
            if not isinstance(image_path, (str, Path)):
                image = Image.open(image_path).convert("RGB")
            else:
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
            confidence = float(conf.item())
            
            # 保存预测结果到数据库
            if isinstance(image_path, (str, Path)):
                img_path_str = str(image_path)
            else:
                # 如果是文件对象，保存文件名
                img_path_str = str(image_path.name) if hasattr(image_path, 'name') else "uploaded_image"
                
            PredictionHistory.objects.create(
                image_path=img_path_str,
                prediction=prediction,
                confidence=confidence
            )
            
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
        return PredictionHistory.objects.all()[:limit] 