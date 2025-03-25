from flask import Flask, request, jsonify
from flask_cors import CORS
import os
from werkzeug.utils import secure_filename
from dog2 import DogClassifier  # 导入封装好的分类器
from food import FeedingSystem  # 导入喂食系统
import datetime
import json

# 初始化Flask应用
app = Flask(__name__)
CORS(app)  # 允许跨域

# 初始化分类器（单例模式）
classifier = DogClassifier.get_instance()

# 初始化喂食系统 - 使用SQLite数据库存储数据
feeding_system = FeedingSystem(num_breeds=100, db_path="data/dog_data.db")

# 配置文件上传
UPLOAD_FOLDER = 'temp_uploads'
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg'}
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

# 品种名称到ID的映射表 (示例，需要根据实际情况调整)
BREED_NAME_TO_ID = {
    "哈士奇": 1,
    "金毛": 2,
    "拉布拉多": 3,
    "边境牧羊犬": 4,
    "柯基": 5,
    "贵宾犬": 6,
    "德国牧羊犬": 7,
    "比熊": 8,
    "博美": 9,
    "萨摩耶": 10,
    # 可以继续添加其他品种...
}

# 添加全局变量用于保存当前已识别的狗狗及其信息
CURRENT_DOG = {
    "dog_id": None,
    "breed_id": None,
    "breed_name": None,
    "last_updated": None  # 添加最后更新时间
}

# 提供一个函数来更新当前狗狗信息
def update_current_dog(dog_id, breed_id, breed_name):
    """更新当前狗狗信息并记录时间戳"""
    global CURRENT_DOG
    CURRENT_DOG["dog_id"] = dog_id
    CURRENT_DOG["breed_id"] = breed_id
    CURRENT_DOG["breed_name"] = breed_name
    CURRENT_DOG["last_updated"] = datetime.datetime.now().isoformat()
    return CURRENT_DOG

# 识别结果转换为品种ID
def get_breed_id_from_prediction(breed_name):
    # 如果品种名称在映射表中，返回对应ID，否则返回默认值1
    return BREED_NAME_TO_ID.get(breed_name, 1)


def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS


@app.route('/hello', methods=['POST'])
def hello():
    """测试接口"""
    data = request.json
    return jsonify({
        "code": 200,
        "message": f"你好，{data.get('name', '匿名用户')}！",
        "status": "success"
    })


@app.route('/predict', methods=['POST'])
def predict():
    """狗品种识别接口"""
    # 检查文件上传
    if 'image' not in request.files:
        return jsonify({
            "code": 400,
            "status": "error",
            "error": "未上传图片文件"
        }), 400

    file = request.files['image']
    if file.filename == '':
        return jsonify({
            "code": 400,
            "status": "error",
            "error": "空文件名"
        }), 400

    # 验证文件类型
    if not allowed_file(file.filename):
        return jsonify({
            "code": 415,
            "status": "error",
            "error": f"不支持的文件类型，仅支持 {ALLOWED_EXTENSIONS}"
        }), 415

    try:
        # 创建临时文件
        filename = secure_filename(file.filename)
        save_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)

        # 保存文件
        file.save(save_path)

        # 执行预测
        result = classifier.predict(save_path)

        # 清理临时文件
        if os.path.exists(save_path):
            os.remove(save_path)

        # 处理预测结果
        if result['status'] == 'error':
            return jsonify({
                "code": 500,
                "status": "error",
                "error": result['error']
            }), 500

        # 获取品种ID
        breed_id = get_breed_id_from_prediction(result['class'])
        
        # 查找是否有已注册的该品种的狗狗
        dog_id = None
        dogs_info = feeding_system.get_all_dogs()
        if dogs_info['status'] == 'success':
            for dog in dogs_info['dogs']:
                if dog['breed'] == breed_id:
                    dog_id = dog['dog_id']
                    break
                
        # 更新当前识别的狗狗信息
        update_current_dog(
            dog_id=dog_id,
            breed_id=breed_id,
            breed_name=result['class']
        )

        return jsonify({
            "code": 200,
            "status": "success",
            "data": {
                "prediction": result['class'],
                "confidence": result['confidence'],
                "breed_id": breed_id,
                "current_dog": CURRENT_DOG,
                "has_registered_dog": dog_id is not None
            }
        })

    except Exception as e:
        # 清理可能的残留文件
        if 'save_path' in locals() and os.path.exists(save_path):
            os.remove(save_path)

        return jsonify({
            "code": 500,
            "status": "error",
            "error": f"服务器内部错误: {str(e)}"
        }), 500


@app.route('/predict_and_register', methods=['POST'])
def predict_and_register():
    """识别狗品种并直接注册"""
    try:
        # 验证基本信息
        if 'dog_id' not in request.form:
            return jsonify({
                "code": 400,
                "status": "error",
                "message": "缺少必要字段: dog_id"
            }), 400

        if 'age' not in request.form:
            return jsonify({
                "code": 400,
                "status": "error",
                "message": "缺少必要字段: age"
            }), 400

        if 'weight' not in request.form:
            return jsonify({
                "code": 400,
                "status": "error",
                "message": "缺少必要字段: weight"
            }), 400

        # 检查文件上传
        if 'image' not in request.files:
            return jsonify({
                "code": 400,
                "status": "error",
                "message": "未上传图片文件"
            }), 400

        file = request.files['image']
        if file.filename == '':
            return jsonify({
                "code": 400,
                "status": "error",
                "message": "空文件名"
            }), 400

        # 验证文件类型
        if not allowed_file(file.filename):
            return jsonify({
                "code": 415,
                "status": "error",
                "message": f"不支持的文件类型，仅支持 {ALLOWED_EXTENSIONS}"
            }), 415

        # 创建临时文件
        filename = secure_filename(file.filename)
        save_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)

        # 保存文件
        file.save(save_path)

        # 执行预测
        result = classifier.predict(save_path)

        # 清理临时文件
        if os.path.exists(save_path):
            os.remove(save_path)

        # 检查预测结果
        if result['status'] == 'error':
            return jsonify({
                "code": 500,
                "status": "error",
                "message": result['error']
            }), 500

        # 获取品种ID
        breed_id = get_breed_id_from_prediction(result['class'])

        # 处理年龄和体重数据
        try:
            age = float(request.form['age'])
            weight = float(request.form['weight'])
            dog_id = request.form['dog_id']
            
            # 注册狗狗
            register_result = feeding_system.register_dog(dog_id, breed_id, age, weight)
            
            # 更新当前识别的狗狗信息
            update_current_dog(
                dog_id=dog_id,
                breed_id=breed_id,
                breed_name=result['class']
            )
            
            return jsonify({
                "code": 200, 
                "status": "success",
                "data": {
                    "message": register_result['message'],
                    "prediction": result['class'],
                    "confidence": result['confidence'],
                    "dog_id": dog_id,
                    "breed_id": breed_id,
                    "age": age,
                    "weight": weight
                }
            })
            
        except ValueError:
            return jsonify({
                "code": 400,
                "status": "error",
                "message": "年龄和体重必须是数字"
            }), 400
            
    except Exception as e:
        # 清理可能的残留文件
        if 'save_path' in locals() and os.path.exists(save_path):
            os.remove(save_path)
            
        return jsonify({
            "code": 500,
            "status": "error",
            "message": f"服务器内部错误: {str(e)}"
        }), 500


@app.route('/dog/register', methods=['POST'])
def register_dog():
    """注册新狗狗"""
    try:
        data = request.json
        
        # 验证必要字段
        if not data:
            return jsonify({
                "code": 400,
                "status": "error",
                "message": "未提供JSON数据"
            }), 400
            
        required_fields = ['dog_id', 'breed', 'age', 'weight']
        for field in required_fields:
            if field not in data:
                return jsonify({
                    "code": 400,
                    "status": "error",
                    "message": f"缺少必要字段: {field}"
                }), 400
                
        # 数据类型验证
        try:
            breed = int(data['breed'])
            age = float(data['age'])
            weight = float(data['weight'])
        except ValueError:
            return jsonify({
                "code": 400,
                "status": "error",
                "message": "品种ID必须是整数，年龄和体重必须是数字"
            }), 400
            
        # 注册狗狗
        result = feeding_system.register_dog(
            data['dog_id'], 
            breed, 
            age, 
            weight
        )
        
        if result['status'] == 'success':
            return jsonify({
                "code": 200,
                "status": "success",
                "data": result
            })
        else:
            return jsonify({
                "code": 500,
                "status": "error", 
                "message": result['message']
            }), 500
            
    except Exception as e:
        return jsonify({
            "code": 500,
            "status": "error",
            "message": f"服务器内部错误: {str(e)}"
        }), 500


@app.route('/dog/update', methods=['POST'])
def update_dog():
    """更新狗狗信息"""
    try:
        data = request.json
        
        # 验证数据
        if not data:
            return jsonify({
                "code": 400,
                "status": "error",
                "message": "未提供JSON数据"
            }), 400
            
        if 'dog_id' not in data:
            return jsonify({
                "code": 400,
                "status": "error",
                "message": "缺少必要字段: dog_id"
            }), 400
            
        # 准备更新参数
        update_params = {}
        
        # 检查并验证年龄
        if 'age' in data:
            try:
                update_params['age'] = float(data['age'])
                if update_params['age'] <= 0 or update_params['age'] > 30:
                    return jsonify({
                        "code": 400,
                        "status": "error",
                        "message": "年龄必须大于0且小于30"
                    }), 400
            except ValueError:
                return jsonify({
                    "code": 400,
                    "status": "error",
                    "message": "年龄必须是数字"
                }), 400
                
        # 检查并验证体重
        if 'weight' in data:
            try:
                update_params['weight'] = float(data['weight'])
                if update_params['weight'] <= 0 or update_params['weight'] > 100:
                    return jsonify({
                        "code": 400,
                        "status": "error",
                        "message": "体重必须大于0且小于100"
                    }), 400
            except ValueError:
                return jsonify({
                    "code": 400,
                    "status": "error",
                    "message": "体重必须是数字"
                }), 400
                
        # 如果没有提供任何需要更新的字段
        if not update_params:
            return jsonify({
                "code": 400,
                "status": "error",
                "message": "未提供任何可更新字段 (age 或 weight)"
            }), 400
            
        # 更新狗狗信息
        result = feeding_system.update_dog_profile(data['dog_id'], **update_params)
        
        if result['status'] == 'success':
            return jsonify({
                "code": 200,
                "status": "success",
                "data": result
            })
        else:
            return jsonify({
                "code": 404, 
                "status": "error",
                "message": result['message']
            }), 404
            
    except Exception as e:
        return jsonify({
            "code": 500,
            "status": "error",
            "message": f"服务器内部错误: {str(e)}"
        }), 500


@app.route('/dog/profile/<dog_id>', methods=['GET'])
def get_dog_profile(dog_id):
    """获取狗狗档案信息"""
    try:
        result = feeding_system.get_dog_profile(dog_id)
        
        if result['status'] == 'success':
            return jsonify({
                "code": 200,
                "status": "success",
                "data": result
            })
        else:
            return jsonify({
                "code": 404,
                "status": "error",
                "message": result['message']
            }), 404
            
    except Exception as e:
        return jsonify({
            "code": 500,
            "status": "error",
            "message": f"服务器内部错误: {str(e)}"
        }), 500


@app.route('/dog/recommend', methods=['POST'])
def recommend_feeding():
    """获取喂食推荐"""
    try:
        data = request.json
        
        # 验证数据
        if not data:
            return jsonify({
                "code": 400,
                "status": "error",
                "message": "未提供JSON数据"
            }), 400
            
        required_fields = ['dog_id', 'activity', 'health']
        for field in required_fields:
            if field not in data:
                return jsonify({
                    "code": 400,
                    "status": "error",
                    "message": f"缺少必要字段: {field}"
                }), 400
                
        # 数据验证
        try:
            activity = float(data['activity'])
            health = float(data['health'])
            
            # 验证范围
            if not (0 <= activity <= 10):
                return jsonify({
                    "code": 400,
                    "status": "error",
                    "message": "活动量必须在0-10之间"
                }), 400
                
            if not (0 <= health <= 1):
                return jsonify({
                    "code": 400,
                    "status": "error",
                    "message": "健康状况必须在0-1之间"
                }), 400
                
        except ValueError:
            return jsonify({
                "code": 400,
                "status": "error",
                "message": "活动量和健康状况必须是数字"
            }), 400
            
        # 获取推荐
        consider_leftover = data.get('consider_leftover', True)
        result = feeding_system.recommend(data['dog_id'], activity, health, consider_leftover)
        
        if result['status'] == 'success':
            return jsonify({
                "code": 200,
                "status": "success",
                "data": result
            })
        else:
            return jsonify({
                "code": 404,
                "status": "error",
                "message": result['message']
            }), 404
            
    except Exception as e:
        return jsonify({
            "code": 500,
            "status": "error",
            "message": f"服务器内部错误: {str(e)}"
        }), 500


@app.route('/dog/feeding', methods=['POST'])
def record_feeding():
    """记录喂食情况"""
    try:
        data = request.json
        
        # 验证数据
        if not data:
            return jsonify({
                "code": 400,
                "status": "error",
                "message": "未提供JSON数据"
            }), 400
            
        required_fields = ['dog_id', 'recommendation', 'eaten_amount', 'leftover_amount', 'activity', 'health']
        for field in required_fields:
            if field not in data:
                return jsonify({
                    "code": 400,
                    "status": "error",
                    "message": f"缺少必要字段: {field}"
                }), 400
                
        # 数据验证
        try:
            recommendation = float(data['recommendation'])
            eaten_amount = float(data['eaten_amount'])
            leftover_amount = float(data['leftover_amount'])
            activity = float(data['activity'])
            health = float(data['health'])
            
            # 验证基本逻辑
            if eaten_amount < 0 or leftover_amount < 0:
                return jsonify({
                    "code": 400,
                    "status": "error",
                    "message": "食用量和剩余量不能为负数"
                }), 400
                
            # 验证活动和健康状况范围
            if not (0 <= activity <= 10):
                return jsonify({
                    "code": 400,
                    "status": "error",
                    "message": "活动量必须在0-10之间"
                }), 400
                
            if not (0 <= health <= 1):
                return jsonify({
                    "code": 400,
                    "status": "error",
                    "message": "健康状况必须在0-1之间"
                }), 400
                
        except ValueError:
            return jsonify({
                "code": 400,
                "status": "error",
                "message": "所有数值字段必须是数字"
            }), 400
            
        # 记录喂食数据
        result = feeding_system.record_feeding(
            data['dog_id'],
            recommendation,
            eaten_amount,
            leftover_amount,
            activity,
            health
        )
        
        if result['status'] == 'success':
            return jsonify({
                "code": 200,
                "status": "success",
                "data": result
            })
        else:
            return jsonify({
                "code": 404,
                "status": "error",
                "message": result['message']
            }), 404
            
    except Exception as e:
        return jsonify({
            "code": 500,
            "status": "error",
            "message": f"服务器内部错误: {str(e)}"
        }), 500


@app.route('/dog/list', methods=['GET'])
def list_dogs():
    """获取所有狗狗列表"""
    try:
        result = feeding_system.get_all_dogs()
        
        if result['status'] == 'success':
            return jsonify({
                "code": 200,
                "status": "success",
                "data": result
            })
        else:
            return jsonify({
                "code": 500,
                "status": "error",
                "message": "获取狗狗列表失败"
            }), 500
            
    except Exception as e:
        return jsonify({
            "code": 500,
            "status": "error",
            "message": f"服务器内部错误: {str(e)}"
        }), 500


@app.route('/breed_list', methods=['GET'])
def get_breed_list():
    """获取所有支持的狗狗品种列表"""
    try:
        breed_list = [{"id": id, "name": name} for name, id in BREED_NAME_TO_ID.items()]
        
        return jsonify({
            "code": 200,
            "status": "success",
            "data": {
                "count": len(breed_list),
                "breeds": breed_list
            }
        })
    except Exception as e:
        return jsonify({
            "code": 500,
            "status": "error",
            "message": f"服务器内部错误: {str(e)}"
        }), 500


# 温湿度相关接口
@app.route('/dog/temperature', methods=['POST'])
def record_temperature():
    """记录狗狗环境温湿度"""
    try:
        data = request.json
        
        # 验证数据
        if not data:
            return jsonify({
                "code": 400,
                "status": "error",
                "message": "未提供JSON数据"
            }), 400
        
        required_fields = ['dog_id', 'temperature', 'humidity']
        for field in required_fields:
            if field not in data:
                return jsonify({
                    "code": 400,
                    "status": "error",
                    "message": f"缺少必要字段: {field}"
                }), 400
        
        # 数据验证
        try:
            temperature = float(data['temperature'])
            humidity = float(data['humidity'])
            
            # 简单的温湿度范围验证
            if temperature < -50 or temperature > 100:
                return jsonify({
                    "code": 400,
                    "status": "error",
                    "message": "温度超出合理范围"
                }), 400
                
            if humidity < 0 or humidity > 100:
                return jsonify({
                    "code": 400,
                    "status": "error",
                    "message": "湿度必须在0-100%之间"
                }), 400
                
        except ValueError:
            return jsonify({
                "code": 400,
                "status": "error",
                "message": "温度和湿度必须是数字"
            }), 400
            
        # 记录温湿度数据
        result = feeding_system.record_temperature(
            data['dog_id'],
            temperature,
            humidity
        )
        
        if result['status'] == 'success':
            return jsonify({
                "code": 200,
                "status": "success",
                "data": result
            })
        else:
            return jsonify({
                "code": 404,
                "status": "error",
                "message": result['message']
            }), 404
            
    except Exception as e:
        return jsonify({
            "code": 500,
            "status": "error",
            "message": f"服务器内部错误: {str(e)}"
        }), 500


@app.route('/dog/temperature/history/<dog_id>', methods=['GET'])
def get_temperature_history(dog_id):
    """获取狗狗的温湿度历史记录"""
    try:
        # 获取限制参数，默认10条
        limit = request.args.get('limit', 10, type=int)
        if limit <= 0 or limit > 100:
            limit = 10  # 限制合理范围
            
        result = feeding_system.get_temperature_history(dog_id, limit)
        
        if result['status'] == 'success':
            return jsonify({
                "code": 200,
                "status": "success",
                "data": result
            })
        else:
            return jsonify({
                "code": 404,
                "status": "error",
                "message": result['message']
            }), 404
            
    except Exception as e:
        return jsonify({
            "code": 500,
            "status": "error",
            "message": f"服务器内部错误: {str(e)}"
        }), 500


# 运动记录相关接口
@app.route('/dog/activity', methods=['POST'])
def record_activity():
    """记录狗狗运动情况"""
    try:
        data = request.json
        
        # 验证数据
        if not data:
            return jsonify({
                "code": 400,
                "status": "error",
                "message": "未提供JSON数据"
            }), 400
        
        required_fields = ['dog_id', 'activity_type', 'duration', 'intensity']
        for field in required_fields:
            if field not in data:
                return jsonify({
                    "code": 400,
                    "status": "error",
                    "message": f"缺少必要字段: {field}"
                }), 400
        
        # 数据验证
        try:
            activity_type = str(data['activity_type'])
            duration = float(data['duration'])
            intensity = float(data['intensity'])
            
            # 简单的运动数据验证
            if duration < 0:
                return jsonify({
                    "code": 400,
                    "status": "error",
                    "message": "运动时长不能为负数"
                }), 400
                
            if intensity < 0 or intensity > 10:
                return jsonify({
                    "code": 400,
                    "status": "error",
                    "message": "运动强度必须在0-10之间"
                }), 400
                
        except ValueError:
            return jsonify({
                "code": 400,
                "status": "error",
                "message": "运动时长和强度必须是数字"
            }), 400
            
        # 记录运动数据
        result = feeding_system.record_activity(
            data['dog_id'],
            activity_type,
            duration,
            intensity
        )
        
        if result['status'] == 'success':
            return jsonify({
                "code": 200,
                "status": "success",
                "data": result
            })
        else:
            return jsonify({
                "code": 404,
                "status": "error",
                "message": result['message']
            }), 404
            
    except Exception as e:
        return jsonify({
            "code": 500,
            "status": "error",
            "message": f"服务器内部错误: {str(e)}"
        }), 500


@app.route('/dog/activity/history/<dog_id>', methods=['GET'])
def get_activity_history(dog_id):
    """获取狗狗的运动历史记录"""
    try:
        # 获取限制参数，默认10条
        limit = request.args.get('limit', 10, type=int)
        if limit <= 0 or limit > 100:
            limit = 10  # 限制合理范围
            
        result = feeding_system.get_activity_history(dog_id, limit)
        
        if result['status'] == 'success':
            return jsonify({
                "code": 200,
                "status": "success",
                "data": result
            })
        else:
            return jsonify({
                "code": 404,
                "status": "error",
                "message": result['message']
            }), 404
            
    except Exception as e:
        return jsonify({
            "code": 500,
            "status": "error",
            "message": f"服务器内部错误: {str(e)}"
        }), 500


@app.route('/dog/feeding/history/<dog_id>', methods=['GET'])
def get_feeding_history(dog_id):
    """获取狗狗的喂食历史记录"""
    try:
        # 获取限制参数，默认10条
        limit = request.args.get('limit', 10, type=int)
        if limit <= 0 or limit > 100:
            limit = 10  # 限制合理范围
            
        result = feeding_system.get_feeding_history(dog_id, limit)
        
        if result['status'] == 'success':
            return jsonify({
                "code": 200,
                "status": "success",
                "data": result
            })
        else:
            return jsonify({
                "code": 404,
                "status": "error",
                "message": result['message']
            }), 404
            
    except Exception as e:
        return jsonify({
            "code": 500,
            "status": "error",
            "message": f"服务器内部错误: {str(e)}"
        }), 500


@app.route('/activity/current_dog', methods=['GET'])
def get_current_dog():
    """获取当前识别的狗狗信息"""
    try:
        if not CURRENT_DOG["dog_id"]:
            # 尝试获取第一只已注册的狗狗
            dogs_info = feeding_system.get_all_dogs()
            if dogs_info['status'] == 'success' and dogs_info['dogs']:
                dog_id = dogs_info['dogs'][0]['dog_id']
                profile = feeding_system.get_dog_profile(dog_id)
                if profile['status'] == 'success':
                    breed_name = None
                    for name, id in BREED_NAME_TO_ID.items():
                        if id == profile['breed']:
                            breed_name = name
                            break
                    
                    # 更新当前狗狗信息
                    update_current_dog(
                        dog_id=dog_id,
                        breed_id=profile['breed'],
                        breed_name=breed_name or "未知品种"
                    )
        
        if not CURRENT_DOG["dog_id"]:
            return jsonify({
                "code": 404,
                "status": "error",
                "message": "尚未识别或注册任何狗狗"
            }), 404
            
        # 添加狗狗详细信息
        extra_info = {}
        if CURRENT_DOG["dog_id"]:
            profile = feeding_system.get_dog_profile(CURRENT_DOG["dog_id"])
            if profile['status'] == 'success':
                extra_info = {
                    "age": profile['age'],
                    "weight": profile['weight'],
                    "total_feedings": profile['total_feedings']
                }
            
        return jsonify({
            "code": 200,
            "status": "success",
            "data": {
                **CURRENT_DOG,
                **extra_info
            }
        })
            
    except Exception as e:
        return jsonify({
            "code": 500,
            "status": "error",
            "message": f"服务器内部错误: {str(e)}"
        }), 500

@app.route('/activity/set_current_dog', methods=['POST'])
def set_current_dog():
    """设置当前要监测的狗狗"""
    try:
        data = request.json
        if not data or 'dog_id' not in data:
            return jsonify({
                "code": 400,
                "status": "error",
                "message": "请提供狗狗ID"
            }), 400
            
        dog_id = data['dog_id']
        profile = feeding_system.get_dog_profile(dog_id)
        
        if profile['status'] != 'success':
            return jsonify({
                "code": 404,
                "status": "error",
                "message": f"未找到狗狗ID: {dog_id}"
            }), 404
            
        # 查找品种名称
        breed_name = None
        for name, id in BREED_NAME_TO_ID.items():
            if id == profile['breed']:
                breed_name = name
                break
                
        # 更新当前狗狗信息
        update_current_dog(
            dog_id=dog_id,
            breed_id=profile['breed'],
            breed_name=breed_name or "未知品种"
        )
        
        return jsonify({
            "code": 200,
            "status": "success",
            "data": {
                **CURRENT_DOG,
                "age": profile['age'],
                "weight": profile['weight']
            }
        })
            
    except Exception as e:
        return jsonify({
            "code": 500,
            "status": "error",
            "message": f"服务器内部错误: {str(e)}"
        }), 500


# 程序退出时清理资源
@app.teardown_appcontext
def cleanup_resources(exception=None):
    feeding_system.cleanup()


# 兼容旧版微信小程序的接口
@app.route('/feeding/update', methods=['POST'])
def update_feeding_data():
    """更新喂食数据（旧版前端兼容API）"""
    try:
        data = request.json
        print("收到喂食数据更新:", data)
        
        if 'dog_id' not in data:
            return jsonify({
                "code": 400,
                "status": "error",
                "message": "缺少必要参数: dog_id"
            }), 400
        
        # 检查狗狗是否存在
        dog_info = feeding_system.get_dog_profile(data['dog_id'])
        if dog_info['status'] != 'success':
            # 如果狗狗不存在，尝试使用当前狗狗
            if CURRENT_DOG["dog_id"]:
                data['dog_id'] = CURRENT_DOG["dog_id"]
                dog_info = feeding_system.get_dog_profile(data['dog_id'])
                if dog_info['status'] != 'success':
                    return jsonify({
                        "code": 404,
                        "status": "error",
                        "message": "未找到指定的狗狗"
                    }), 404
            else:
                return jsonify({
                    "code": 404,
                    "status": "error",
                    "message": "未找到指定的狗狗"
                }), 404
                
        # 更新剩余食物量(如果提供)
        if 'remaining_food' in data:
            try:
                leftover = float(data['remaining_food']) / 1000  # 转换为千克
                
                # 获取最新的推荐值和其他必要参数
                # 由于旧版接口没有提供完整信息，使用默认值
                recommendation = dog_info['last_feeding']
                eaten_amount = dog_info['last_feeding'] # 假设全部吃完
                activity = 1.0  # 默认活动量
                health = 1.0    # 默认健康状况
                
                # 记录一条喂食记录，主要是为了更新leftover_food
                feeding_system.record_feeding(
                    dog_id=data['dog_id'],
                    recommendation=recommendation,
                    eaten_amount=eaten_amount,
                    leftover_amount=leftover,
                    activity=activity,
                    health=health
                )
                
                print(f"已更新狗狗{data['dog_id']}的剩余食物量: {leftover}kg")
            except Exception as e:
                print(f"无法更新剩余食物量: {data.get('remaining_food')}, 错误: {e}")
        
        # 更新饲养计划(如果提供)
        if 'daily_plan' in data:
            # 这里只是记录，没有实际更新模型
            print(f"收到狗狗{data['dog_id']}的饲养计划:", data['daily_plan'])
        
        return jsonify({
            "code": 200,
            "status": "success",
            "message": "喂食数据更新成功",
            "data": {}
        })
    except Exception as e:
        print(f"更新喂食数据异常: {str(e)}")
        return jsonify({
            "code": 500,
            "status": "error",
            "message": f"服务器内部错误: {str(e)}"
        }), 500

@app.route('/feeding/record', methods=['POST'])
def record_feeding_compat():
    """记录喂食（旧版前端兼容API）"""
    try:
        data = request.json
        print("收到喂食记录:", data)
        
        if 'dog_id' not in data or 'amount' not in data:
            return jsonify({
                "code": 400,
                "status": "error",
                "message": "缺少必要参数: dog_id 或 amount"
            }), 400
        
        # 检查狗狗是否存在
        dog_info = feeding_system.get_dog_profile(data['dog_id'])
        if dog_info['status'] != 'success':
            # 如果狗狗不存在，尝试使用当前狗狗
            if CURRENT_DOG["dog_id"]:
                data['dog_id'] = CURRENT_DOG["dog_id"]
                dog_info = feeding_system.get_dog_profile(data['dog_id'])
                if dog_info['status'] != 'success':
                    return jsonify({
                        "code": 404,
                        "status": "error",
                        "message": "未找到指定的狗狗"
                    }), 404
            else:
                return jsonify({
                    "code": 404,
                    "status": "error",
                    "message": "未找到指定的狗狗"
                }), 404
                
        # 获取当前的推荐值
        recommendation_result = feeding_system.recommend(data['dog_id'], 1.0, 1.0)
        
        # 记录实际喂食量
        try:
            amount_kg = float(data['amount']) / 1000  # 转换为千克
            
            # 假设全部吃完，没有剩余
            leftover = 0
            
            # 更新喂食记录
            result = feeding_system.record_feeding(
                dog_id=data['dog_id'],
                recommendation=recommendation_result['recommendation'] if recommendation_result['status'] == 'success' else 0.1,
                eaten_amount=amount_kg,
                leftover_amount=leftover,
                activity=1.0,  # 活动量默认值
                health=1.0     # 健康指数默认值
            )
            
            if result['status'] == 'success':
                # 获取狗狗品种名称
                breed_name = "未知品种"
                
                # 从breed_id映射到品种名称
                if 'breed' in dog_info:
                    breed_id = dog_info['breed']
                    for name, id in BREED_NAME_TO_ID.items():
                        if id == breed_id:
                            breed_name = name
                            break
                
                # 获取或生成狗狗名称
                dog_name = data.get('dog_name', f"狗狗-{data['dog_id']}")
                
                return jsonify({
                    "code": 200,
                    "status": "success",
                    "message": "喂食记录添加成功",
                    "data": {
                        "consumed": result['consumed'] * 1000,  # 转换为克
                        "leftover": result['leftover'] * 1000,   # 转换为克
                        "dog_id": data['dog_id'],
                        "dog_name": dog_name,
                        "breed": breed_name,
                        "age": dog_info.get('age', 0),
                        "weight": dog_info.get('weight', 0)
                    }
                })
            else:
                return jsonify({
                    "code": 500,
                    "status": "error",
                    "message": result['message']
                }), 500
        except ValueError:
            return jsonify({
                "code": 400,
                "status": "error",
                "message": "喂食量格式错误"
            }), 400
        except Exception as e:
            return jsonify({
                "code": 500,
                "status": "error",
                "message": f"处理喂食记录时出错: {str(e)}"
            }), 500
            
    except Exception as e:
        print(f"添加喂食记录异常: {str(e)}")
        return jsonify({
            "code": 500,
            "status": "error",
            "message": f"服务器内部错误: {str(e)}"
        }), 500


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)