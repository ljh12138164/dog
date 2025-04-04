#include <WiFi.h>  
#include <DHT.h>  
#include <WebSocketsClient.h>
#include <ArduinoJson.h>
#include <Wire.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>

// OLED显示屏配置
#define SCREEN_WIDTH 128    // OLED显示屏宽度，单位：像素
#define SCREEN_HEIGHT 64    // OLED显示屏高度，单位：像素
#define OLED_RESET -1      // Reset引脚（-1表示共享Arduino的复位引脚）
#define SCREEN_ADDRESS 0x3C // OLED显示屏的I2C地址

// I2C引脚定义
#define SCL_PIN 22
#define SDA_PIN 21

// 创建显示屏对象
Adafruit_SSD1306 display(SCREEN_WIDTH, SCREEN_HEIGHT, &Wire, OLED_RESET);

// WiFi配置  
const char* ssid = "PPX";  
const char* password = "a1668692058";  

// WebSocket服务器配置
const char* wsHost = "192.168.177.197";  // 您的服务器IP
const uint16_t wsPort = 8380;
const char* wsPath = "/env";  // 使用根路径

// 传感器引脚配置  
#define DHT_PIN 17      // DHT11温湿度传感器引脚
#define LIGHT_PIN 35    // 光敏电阻引脚(ADC1_CH0)
#define BUZZER_PIN 25   // 蜂鸣器引脚
#define BUTTON_PIN 18   // 添加按键引脚定义
#define DHT_TYPE DHT11  

// 光照强度映射范围
#define LIGHT_MIN 0     // ADC最小值
#define LIGHT_MAX 4095  // ADC最大值（12位ADC）

// 温度警报阈值
#define TEMP_THRESHOLD 25.0  // 温度警报阈值（摄氏度）

// 连接状态
volatile bool wsConnected = false;
bool isRunning = false;             // 添加运行状态标志，初始为停止
unsigned long lastReconnectAttempt = 0;
const unsigned long reconnectInterval = 5000;  // 重连间隔5秒
unsigned long lastDataSendTime = 0;
const unsigned long dataSendInterval = 2000;   // 数据发送间隔2秒

unsigned long sensorErrorDisplayUntil = 0; // 用于非阻塞显示传感器错误
unsigned long wifiReconnectDisplayUntil = 0; // 用于非阻塞显示WiFi重连
unsigned long lastDisplayUpdateTime = 0; // 用于停止状态下的屏幕刷新

// 按键防抖变量
unsigned long lastDebounceTime = 0;
unsigned long debounceDelay = 50; // 50ms 防抖
int lastButtonState = HIGH;      // 上拉电阻，初始为高
int currentButtonState = HIGH;   // 当前稳定状态

DHT dht(DHT_PIN, DHT_TYPE);  
WebSocketsClient webSocket;  

// 读取光照强度（返回0-100的百分比）
int readLightLevel() {
    int rawValue = analogRead(LIGHT_PIN);
    int lightLevel = map(rawValue, LIGHT_MIN, LIGHT_MAX, 0, 100);
    lightLevel = constrain(lightLevel, 0, 100);
    return lightLevel;
}

// 控制蜂鸣器
void controlBuzzer(float temperature) {
    if (isRunning && !isnan(temperature) && temperature > TEMP_THRESHOLD) {
        digitalWrite(BUZZER_PIN, HIGH);
    } else {
        digitalWrite(BUZZER_PIN, LOW);
    }
}

// WebSocket事件处理函数
void webSocketEvent(WStype_t type, uint8_t * payload, size_t length) {
    switch(type) {
        case WStype_DISCONNECTED:
            Serial.printf("[WebSocket] 事件: 断开连接!\n");
            wsConnected = false;
            break;
        case WStype_CONNECTED:
            Serial.printf("[WebSocket] 事件: 连接成功，URL: %s\n", payload);
            wsConnected = true;
            break;
        case WStype_TEXT:
            Serial.printf("[WebSocket] 事件: 收到文本: %s\n", payload);
            break;
        case WStype_BIN:
            Serial.printf("[WebSocket] 收到二进制数据，长度: %u\n", length);
            break;
        case WStype_ERROR:
            Serial.printf("[WebSocket] 事件: 错误: %s\n", payload);
            wsConnected = false;
            break;
        case WStype_FRAGMENT_TEXT_START:
        case WStype_FRAGMENT_BIN_START:
        case WStype_FRAGMENT:
        case WStype_FRAGMENT_FIN:
            break;
        case WStype_PING:
            //Serial.println("[WebSocket] 事件: 收到 PING");
            break;
        case WStype_PONG:
            //Serial.println("[WebSocket] 事件: 收到 PONG");
            break;
    }
}

// 尝试重新连接WebSocket
void tryReconnectWebSocket() {
    if (isRunning && WiFi.status() == WL_CONNECTED && !wsConnected && (millis() - lastReconnectAttempt > reconnectInterval)) {
        Serial.println("[WebSocket] 尝试外部重连...");
        webSocket.begin(wsHost, wsPort, wsPath);
        lastReconnectAttempt = millis();
    }
}

// 更新OLED显示
void updateDisplay(float temperature, float humidity, int lightLevel, bool alarm, bool running) {
    display.clearDisplay();
    display.setTextSize(1);
    display.setTextColor(SSD1306_WHITE);
    
    display.setCursor(0, 0);
    display.print("Status: ");
    display.print(running ? "Running" : "Stopped");

    if (running) {
        display.setCursor(0, 10);
        display.print("T:");
        if (isnan(temperature)) display.print("ERR"); else display.print(temperature, 1);
        display.setCursor(64, 10);
        display.print(" H:");
        if (isnan(humidity)) display.print("ERR"); else display.print(humidity, 1);

        display.setCursor(0, 20);
        display.print("L:");
        if(lightLevel < 0) display.print("--"); else display.print(lightLevel);
        display.print("%");

        if (alarm) {
            display.setCursor(64, 20);
            display.setTextColor(SSD1306_BLACK, SSD1306_WHITE);
            display.print(" ALARM! ");
            display.setTextColor(SSD1306_WHITE);
        }
        
        if (millis() < sensorErrorDisplayUntil) {
            display.setCursor(0, 50);
            display.setTextColor(SSD1306_BLACK, SSD1306_WHITE);
            display.print(" Sensor ERROR! ");
            display.setTextColor(SSD1306_WHITE);
        } else if (millis() < wifiReconnectDisplayUntil) {
            display.setCursor(0, 50);
            display.setTextColor(SSD1306_BLACK, SSD1306_WHITE);
            display.print(" WiFi Check... ");
            display.setTextColor(SSD1306_WHITE);
        }
    } else {
        display.setCursor(0, 20);
        display.println("Press button");
        display.setCursor(0, 30);
        display.println("to start...");
    }

    display.setCursor(0, SCREEN_HEIGHT - 8);
    wl_status_t wifiStatus = WiFi.status();
    display.print("WiFi:");
    display.print((wifiStatus == WL_CONNECTED) ? "OK" : "NC");
    display.print(" WS:");
    display.print((running && wsConnected) ? "OK" : "NC");

    if (wifiStatus == WL_CONNECTED) {
        display.setCursor(SCREEN_WIDTH - 30, SCREEN_HEIGHT - 8);
        display.print(WiFi.localIP().toString().substring(WiFi.localIP().toString().lastIndexOf('.')+1));
    }

    display.display();
}

void setup() {  
    Serial.begin(115200);  // 提高波特率以获得更好的调试输出
    while (!Serial); // 等待串口连接 (可选)
    Serial.println("\n[System] 初始化...");  

    // 初始化I2C
    Wire.begin(SDA_PIN, SCL_PIN);
    
    // 初始化OLED显示屏
    if(!display.begin(SSD1306_SWITCHCAPVCC, SCREEN_ADDRESS)) {
        Serial.println(F("[Error] SSD1306 初始化失败"));
        for(;;);
    }
    
    // 设置显示屏的对比度（可选）
    display.ssd1306_command(SSD1306_SETCONTRAST);
    display.ssd1306_command(128); // 设置对比度为中等亮度
    
    display.clearDisplay();
    display.setTextSize(1);
    display.setTextColor(SSD1306_WHITE);
    display.setCursor(0,0);
    display.println("Initializing...");
    display.display();
    delay(1000);  // 缩短启动显示时间

    // 初始化传感器
    dht.begin();
    pinMode(LIGHT_PIN, INPUT);
    pinMode(BUZZER_PIN, OUTPUT);
    digitalWrite(BUZZER_PIN, LOW);
    pinMode(BUTTON_PIN, INPUT_PULLUP); // 初始化按键

    // 连接到WiFi  
    Serial.print("[WiFi] 连接到: ");
    Serial.println(ssid);
    display.clearDisplay();
    display.setCursor(0,10);
    display.print("Connecting WiFi...");
    display.display();
    
    WiFi.mode(WIFI_STA);
    WiFi.begin(ssid, password);  
    unsigned long wifiStart = millis();
    while (WiFi.status() != WL_CONNECTED && millis() - wifiStart < 20000) { // 20秒超时
        delay(500);  
        Serial.print(".");
        display.print(".");
        display.display();
    }  
    
    if (WiFi.status() == WL_CONNECTED) {  
        Serial.println("\n[WiFi] 连接成功!");  
        Serial.print("[WiFi] IP 地址: ");
        Serial.println(WiFi.localIP());
        display.clearDisplay();
        display.setCursor(0,0);
        display.println("WiFi Connected!");
        display.println(WiFi.localIP().toString());
        display.setCursor(0, 30); display.println("Press button to start...");
        display.display();
        delay(1000);
    } else {  
        Serial.println("\n[Error] WiFi 连接失败!");  
        display.clearDisplay();
        display.setCursor(0,0);
        display.println("WiFi Failed!");
        display.display();
        while(1) delay(1000); // 或者停在这里
    }
    
    // 连接WebSocket
    webSocket.onEvent(webSocketEvent);

    webSocket.enableHeartbeat(15000, 5000, 2);

    webSocket.setReconnectInterval(5000);

    Serial.println("[System] 初始化完成. 等待按键启动...");
    // 确保初始屏幕是停止状态
    updateDisplay(NAN, NAN, -1, false, isRunning); // 显示初始停止界面
}  

void loop() {  
    unsigned long currentMillis = millis();
    
    // 按键检测和防抖
    int reading = digitalRead(BUTTON_PIN);
    if (reading != lastButtonState) {
        lastDebounceTime = currentMillis;
    }
    if ((currentMillis - lastDebounceTime) > debounceDelay) {
        if (reading != currentButtonState) {
            currentButtonState = reading;
            if (currentButtonState == LOW) { // 检测到稳定按下状态
                isRunning = !isRunning; // 切换状态
                Serial.printf("[Control] 按键按下，状态切换为: %s\n", isRunning ? "运行中" : "已停止");

                if (isRunning) {
                    // 切换到运行
                    Serial.println("[System] 开始运行...");
                    // 尝试连接WebSocket (如果WiFi已连接)
                    if (WiFi.status() == WL_CONNECTED) {
                         Serial.println("[WebSocket] 首次尝试连接...");
                         webSocket.begin(wsHost, wsPort, wsPath); // 首次启动主动连接
                         lastReconnectAttempt = currentMillis;
                    } else {
                         Serial.println("[Warn] WiFi 未连接，无法启动 WebSocket");
                         // isRunning 仍然为 true, 等待 WiFi 恢复
                    }
                } else {
                    // 切换到停止
                    Serial.println("[System] 停止运行...");
                    if (wsConnected) {
                        webSocket.disconnect(); // 主动断开
                        Serial.println("[WebSocket] 已手动断开");
                    }
                    digitalWrite(BUZZER_PIN, LOW); // 关闭蜂鸣器
                    wsConnected = false; // 确保状态同步
                }
                 // 状态切换后立即更新显示
                updateDisplay(NAN, NAN, -1, false, isRunning);
                lastDisplayUpdateTime = currentMillis;
            }
        }
    }
    lastButtonState = reading; // 更新上次读取的状态

    if (isRunning) {
        // 优先运行 webSocket.loop()
        webSocket.loop();

        if (WiFi.status() != WL_CONNECTED) {
            Serial.println("[WiFi] Warn: 连接丢失! 等待自动重连或WebSocket库处理...");
            wifiReconnectDisplayUntil = currentMillis + 2000;
            // WiFi断开，WebSocket必然断开，关闭可能的警报
            if(wsConnected) { // 如果 wsConnected 还没来得及被事件置false
                 wsConnected = false; // 手动置false，避免尝试发送
                 Serial.println("[System] WiFi丢失，标记WebSocket为断开");
            }
            digitalWrite(BUZZER_PIN, LOW);
        }

        if (WiFi.status() == WL_CONNECTED) {
            tryReconnectWebSocket(); // 函数内部检查 isRunning 和 wsConnected
        }

        if (wsConnected && (currentMillis - lastDataSendTime >= dataSendInterval)) {
            float temperature = dht.readTemperature();  
            float humidity = dht.readHumidity();  
            int lightLevel = readLightLevel();

            bool sensorOk = true;
            if (isnan(temperature) || isnan(humidity)) {  
                Serial.println("[Error] 无法读取温湿度传感器!");  
                sensorErrorDisplayUntil = currentMillis + 2000;
                sensorOk = false;
            }  

            controlBuzzer(temperature);

            updateDisplay(temperature, humidity, lightLevel,
                          sensorOk && (temperature > TEMP_THRESHOLD), isRunning);
            lastDisplayUpdateTime = currentMillis; // 更新显示时间戳

            if (sensorOk && wsConnected) {
                StaticJsonDocument<200> doc;
                doc["temperature"] = temperature;
                doc["humidity"] = humidity;
                doc["light"] = lightLevel;
                doc["alarm"] = (temperature > TEMP_THRESHOLD);
                
                String jsonString;
                serializeJson(doc, jsonString);

                if (wsConnected && webSocket.sendTXT(jsonString)) {
                    //Serial.println("[Data] 发送: " + jsonString);
                } else {
                    Serial.println("[Error] WebSocket 发送失败或已断开!");
                }
            }
            lastDataSendTime = currentMillis;
        }
        // 如果长时间没有发送数据（例如WS未连接），也刷新一下屏幕
        else if (currentMillis - lastDisplayUpdateTime > 1000) {
             float temp_dummy = dht.readTemperature(true); // 尝试读取用于显示
             int light_dummy = readLightLevel();
             updateDisplay(temp_dummy, NAN, light_dummy, false, isRunning);
             lastDisplayUpdateTime = currentMillis;
        }
    } else {
        // 停止状态逻辑
        digitalWrite(BUZZER_PIN, LOW); // 确保蜂鸣器关闭

        // 周期性更新停止界面
        if (currentMillis - lastDisplayUpdateTime > 1000) {
             updateDisplay(NAN, NAN, -1, false, isRunning);
             lastDisplayUpdateTime = currentMillis;
        }
    }

    delay(10);
} 