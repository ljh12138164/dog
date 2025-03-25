import torch
import torchvision.transforms as transforms
import torchvision.models as models
from PIL import Image
import os
import logging
from django.conf import settings

# 获取日志记录器
logger = logging.getLogger(__name__)


class DogBreedClassifier:
    def __init__(self):
        try:
            # 默认品种列表 - 如果无法从文件加载则使用
            self.default_breeds = [
                '中华田园犬', '雪纳瑞', '藏獒', '边牧', '博美', '柴犬', 
                '德牧', '哈士奇', '金毛犬', '柯基', '拉布拉多', '萨摩耶'
            ]
            
            # 准备models目录
            models_dir = os.path.join(settings.BASE_DIR, 'models')
            if not os.path.exists(models_dir):
                os.makedirs(models_dir, exist_ok=True)
                logger.warning(f"创建了models目录: {models_dir}")
            
            # 尝试加载真实的品种名
            class_names_path = os.path.join(models_dir, 'class_names.txt')
            try:
                if os.path.exists(class_names_path):
                    with open(class_names_path, 'r', encoding='utf-8') as f:
                        self.class_names = [line.strip() for line in f.readlines()]
                        logger.info(f"成功加载了{len(self.class_names)}种狗狗品种名")
                else:
                    # 如果品种文件不存在，创建一个默认的
                    with open(class_names_path, 'w', encoding='utf-8') as f:
                        for breed in self.default_breeds:
                            f.write(f"{breed}\n")
                    self.class_names = self.default_breeds
                    logger.warning(f"品种名称文件不存在，已创建默认品种名文件: {class_names_path}")
            except Exception as e:
                logger.error(f"无法加载或创建品种名称文件: {str(e)}")
                self.class_names = self.default_breeds
                logger.info(f"使用默认品种列表: {len(self.class_names)}种")
            
            # 加载PyTorch模型
            self.device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
            logger.info(f"使用设备: {self.device}")
            
            model_path = os.path.join(models_dir, 'resnet18_dog_classifier.pth')
            
            # 检查模型文件是否存在
            if not os.path.exists(model_path):
                logger.error(f"模型文件不存在: {model_path}")
                raise FileNotFoundError(f"模型文件不存在: {model_path}")
            
            logger.info(f"加载模型: {model_path}")
            
            # 创建模型架构
            self.model = models.resnet18(weights=None)
            
            # 首先加载模型权重，检查其结构
            state_dict = torch.load(model_path, map_location=self.device)
            logger.info(f"加载的权重类型: {type(state_dict)}")
            
            # 处理state_dict中的键前缀问题
            if isinstance(state_dict, dict):
                # 检查键是否有"resnet."前缀
                has_resnet_prefix = any(k.startswith("resnet.") for k in state_dict.keys())
                
                if has_resnet_prefix:
                    logger.info("检测到state_dict中的键有'resnet.'前缀，正在移除前缀...")
                    # 创建新的state_dict，去除"resnet."前缀
                    new_state_dict = {}
                    for key, value in state_dict.items():
                        if key.startswith("resnet."):
                            new_key = key[7:]  # 去除"resnet."前缀
                            new_state_dict[new_key] = value
                        else:
                            new_state_dict[key] = value
                    
                    state_dict = new_state_dict
                    logger.info(f"已处理state_dict，移除了'resnet.'前缀，现在有{len(state_dict)}个键")
                
                # 检查输出层的大小
                out_features = None
                if "fc.weight" in state_dict:
                    out_features = state_dict["fc.weight"].size(0)
                    logger.info(f"检测到fc层输出特征数: {out_features}")
                elif "fc.3.weight" in state_dict:
                    out_features = state_dict["fc.3.weight"].size(0)
                    logger.info(f"检测到Sequential fc层输出特征数: {out_features}")
                
                if out_features is not None:
                    logger.info(f"模型的输出类别数: {out_features}，本地类别数: {len(self.class_names)}")
                    # 如果模型输出类别数与本地类别数不一致，记录警告
                    if out_features != len(self.class_names):
                        logger.warning(f"模型输出类别数({out_features})与本地类别列表({len(self.class_names)})不匹配")
                
                # 修改fc层以匹配模型权重的输出维度
                if "fc.3.weight" in state_dict:
                    # 这是Sequential类型的fc层
                    input_features = self.model.fc.in_features
                    if out_features is None:
                        out_features = len(self.class_names)
                    
                    # 重新创建fc层，与权重结构匹配
                    self.model.fc = torch.nn.Sequential(
                        torch.nn.Linear(input_features, 512),
                        torch.nn.ReLU(),
                        torch.nn.Dropout(0.5),
                        torch.nn.Linear(512, out_features)
                    )
                    logger.info(f"已创建Sequential fc层，输出维度: {out_features}")
                else:
                    # 这是简单的Linear层
                    input_features = self.model.fc.in_features
                    if out_features is None:
                        out_features = len(self.class_names)
                    
                    self.model.fc = torch.nn.Linear(input_features, out_features)
                    logger.info(f"已创建Linear fc层，输出维度: {out_features}")
                
                # 尝试加载state_dict
                try:
                    self.model.load_state_dict(state_dict)
                    logger.info("成功通过load_state_dict加载模型权重")
                except Exception as e:
                    logger.error(f"通过load_state_dict加载权重失败: {str(e)}")
                    
                    # 尝试加载部分权重
                    logger.info("尝试加载部分权重...")
                    model_dict = self.model.state_dict()
                    
                    # 过滤掉不匹配的层
                    filtered_dict = {k: v for k, v in state_dict.items() if k in model_dict and v.size() == model_dict[k].size()}
                    logger.info(f"过滤后保留了{len(filtered_dict)}/{len(state_dict)}个层")
                    
                    # 更新模型
                    model_dict.update(filtered_dict)
                    self.model.load_state_dict(model_dict)
                    logger.info("成功通过加载部分权重的方式初始化模型")
            else:
                # 如果加载的是完整模型，直接使用
                self.model = state_dict
                logger.info("使用直接加载的模型对象")
            
            # 设置为评估模式
            self.model.eval()
            
            # 定义图像预处理
            self.transform = transforms.Compose([
                transforms.Resize(256),
                transforms.CenterCrop(224),
                transforms.ToTensor(),
                transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
            ])
            
        except Exception as e:
            logger.error(f"初始化DogBreedClassifier失败: {str(e)}")
            raise
            
    def predict(self, image_path):
        logger.info(f"开始预测图像: {image_path}")
        
        try:
            # 检查文件是否存在
            if not os.path.exists(image_path):
                logger.error(f"图像文件不存在: {image_path}")
                raise FileNotFoundError(f"图像文件不存在: {image_path}")
                
            # 打开并预处理图像
            image = Image.open(image_path).convert('RGB')
            logger.info(f"成功打开图像，尺寸: {image.size}")
            image_tensor = self.transform(image).unsqueeze(0).to(self.device)
            
            # 进行预测
            with torch.no_grad():
                outputs = self.model(image_tensor)
                probabilities = torch.nn.functional.softmax(outputs, dim=1)
                
                # 获取前3个预测结果
                top_probs, top_classes = probabilities.topk(min(3, probabilities.size(1)))
                
                # 转换为列表
                top_probs = top_probs.squeeze().tolist()
                top_classes = top_classes.squeeze().tolist()
                
                # 处理单个元素的情况
                if not isinstance(top_probs, list):
                    top_probs = [top_probs]
                    top_classes = [top_classes]
                
                # 确保所有索引都在有效范围内
                valid_results = []
                for i, class_idx in enumerate(top_classes):
                    if class_idx < 0 or class_idx >= len(self.class_names):
                        logger.warning(f"预测的类索引 {class_idx} 超出了有效范围 0-{len(self.class_names)-1}")
                        continue
                    
                    valid_results.append({
                        'breed': self.class_names[class_idx],
                        'confidence': float(top_probs[i])
                    })
                
                if not valid_results:
                    logger.warning("没有有效的预测结果，使用默认索引0")
                    valid_results.append({
                        'breed': self.class_names[0],
                        'confidence': 0.0
                    })
                
                # 返回最高置信度的结果
                best_result = max(valid_results, key=lambda x: x['confidence'])
                
                logger.info(f"模型预测成功，品种: {best_result['breed']}, 置信度: {best_result['confidence']:.4f}")
                
                return best_result
        except Exception as e:
            logger.error(f"预测过程中发生错误: {str(e)}")
            raise 