import requests
import random
import time
from datetime import datetime
import logging
import sqlite3

# 配置日志
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler("test_data.log"),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger("TestData")

# API地址
API_URL = "http://localhost:8000/api/sensor-data/add_data/"
DB_PATH = "db.sqlite3"

def update_temperature_values():
    """
    更新数据库中的空温度值
    """
    logger.info("开始更新现有数据的温度值")
    
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    # 获取所有温度为NULL的记录
    cursor.execute("SELECT id FROM inventory_sensordata WHERE temperature IS NULL")
    null_temp_ids = cursor.fetchall()
    
    if not null_temp_ids:
        logger.info("没有找到温度为NULL的记录")
        conn.close()
        return
    
    logger.info(f"找到{len(null_temp_ids)}条温度为NULL的记录")
    
    for (id,) in null_temp_ids:
        # 生成合理的温度值
        temp = round(random.uniform(20.0, 28.0), 2)
        
        # 更新记录
        cursor.execute(
            "UPDATE inventory_sensordata SET temperature = ? WHERE id = ?",
            (temp, id)
        )
        logger.info(f"已更新ID={id}的记录，温度值={temp}")
    
    # 提交更改
    conn.commit()
    logger.info(f"成功更新了{len(null_temp_ids)}条记录")
    
    conn.close()

def generate_random_data():
    """
    生成随机的传感器数据
    """
    return {
        "type": "emit",
        "temperature": round(random.uniform(18.0, 32.0), 2),  # 温度范围18-32°C
        "humidity": round(random.uniform(30.0, 80.0), 2),     # 湿度范围30%-80%
        "light": round(random.uniform(100.0, 1000.0), 2),     # 光照范围100-1000 lux
        "timestamp": datetime.now().isoformat()
    }

def send_test_data(count=10, interval=5):
    """
    发送测试数据到API
    
    参数:
        count: 要发送的数据点数量
        interval: 发送间隔（秒）
    """
    logger.info(f"开始发送{count}条测试数据，间隔{interval}秒")
    
    for i in range(count):
        data = generate_random_data()
        logger.info(f"发送数据 #{i+1}: {data}")
        
        try:
            response = requests.post(API_URL, json=data)
            
            if response.status_code == 201:
                logger.info(f"数据发送成功: {response.json()}")
            else:
                logger.error(f"数据发送失败: {response.text}, 状态码: {response.status_code}")
        except Exception as e:
            logger.error(f"发送数据时出错: {str(e)}")
        
        if i < count - 1:  # 不在最后一次循环后等待
            time.sleep(interval)
    
    logger.info("测试数据发送完成")

if __name__ == "__main__":
    # 如果需要更新现有数据的温度值
    update_temperature_values()
    
    # 默认发送10条数据，每5秒一条
    # 如果需要更多数据或不同间隔，可以传入参数
    # 例如: send_test_data(count=30, interval=2)
    # send_test_data(count=20, interval=2) 