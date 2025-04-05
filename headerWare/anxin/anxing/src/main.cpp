#include <WiFi.h>  
#include <DHT.h>  
#include <WebSocketsClient.h>
#include <ArduinoJson.h>
#include <time.h>
#include <Wire.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>

// OLED显示器参数
#define SCREEN_WIDTH 128    // OLED显示器宽度，单位像素点
#define SCREEN_HEIGHT 64    // OLED显示器高度，单位像素点
#define OLED_RESET -1      // Reset引脚，-1表示使用Arduino的复位引脚
#define SCREEN_ADDRESS 0x3C // OLED显示器的I2C地址

// I2C引脚定义
#define SCL_PIN 22
#define SDA_PIN 21

// 创建显示器对象
Adafruit_SSD1306 display(SCREEN_WIDTH, SCREEN_HEIGHT, &Wire, OLED_RESET);

// WiFi设置  
const char* ssid = "PPX";  
const char* password = "a1668692058";  

// WebSocket服务器配置
const char* wsHost = "192.168.177.197";  // 你的服务器IP
const uint16_t wsPort = 8380;
const char* wsPath = "/env";  // 使用该路径

// NTP服务器配置
const char* ntpServer = "pool.ntp.org";
const long  gmtOffset_sec = 8 * 3600; // 中国时区UTC+8
const int   daylightOffset_sec = 0;

// 传感器引脚设置  
#define DHT_PIN 17      // DHT11温湿度传感器引脚
#define LIGHT_PIN 35    // 光照传感器引脚(ADC1_CH0)
#define BUZZER_PIN 25   // 蜂鸣器引脚
#define BUTTON_PIN 18   // 按钮按键引脚定义
#define DHT_TYPE DHT11  

// 光照强度映射范围
#define LIGHT_MIN 0     // ADC最小值
#define LIGHT_MAX 4095  // ADC最大值（12位ADC）

// 温度警报阈值
#define TEMP_THRESHOLD 30.0  // 温度警报阈值（摄氏度）

// 连接状态
volatile bool wsConnected = false;
bool isRunning = false;             // 监控运行状态标志，初始为停止
unsigned long lastReconnectAttempt = 0;
const unsigned long reconnectInterval = 5000;  // 重连间隔5秒
unsigned long lastDataSendTime = 0;
const unsigned long dataSendInterval = 1000*30;   // 数据发送间隔2秒

unsigned long sensorErrorDisplayUntil = 0; // 用于短暂性显示错误信息
unsigned long wifiReconnectDisplayUntil = 0; // 用于短暂性显示WiFi重连
unsigned long lastDisplayUpdateTime = 0; // 用于停止状态下屏幕刷新

// 按钮防抖变量
unsigned long lastDebounceTime = 0;
unsigned long debounceDelay = 50; // 50ms 防抖
int lastButtonState = HIGH;      // 上次状态，初始为高
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
        Serial.println("[WebSocket] 重新外部连接...");
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
    Serial.begin(115200);  // 较高波特率以获得更好的调试输出
    while (!Serial); // 等待串口连接 (可选)
    Serial.println("\n[System] 初始化...");  

    // 初始化I2C
    Wire.begin(SDA_PIN, SCL_PIN);
    
    // 初始化OLED显示器
    if(!display.begin(SSD1306_SWITCHCAPVCC, SCREEN_ADDRESS)) {
        Serial.println(F("[Error] SSD1306 初始化失败"));
        for(;;);
    }
    
    // 设置显示器的对比度（可选）
    display.ssd1306_command(SSD1306_SETCONTRAST);
    display.ssd1306_command(128); // 设置对比度为中等亮度
    
    display.clearDisplay();
    display.setTextSize(1);
    display.setTextColor(SSD1306_WHITE);
    display.setCursor(0,0);
    display.println("Initializing...");
    display.display();
    delay(1000);  // 留出启动显示时间

    // 初始化传感器
    dht.begin();
    pinMode(LIGHT_PIN, INPUT);
    pinMode(BUZZER_PIN, OUTPUT);
    digitalWrite(BUZZER_PIN, LOW);
    pinMode(BUTTON_PIN, INPUT_PULLUP); // 初始化按钮

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
        
        // 配置NTP
        configTime(gmtOffset_sec, daylightOffset_sec, ntpServer);
        Serial.println("[NTP] 时间同步中...");
        
        display.setCursor(0, 30); 
        display.println("Press button to start...");
        display.display();
        delay(1000);
    } else {  
        Serial.println("\n[Error] WiFi 连接失败!");  
        display.clearDisplay();
        display.setCursor(0,0);
        display.println("WiFi Failed!");
        display.display();
        while(1) delay(1000); // 暂时停止运行
    }
    
    // 配置WebSocket
    webSocket.onEvent(webSocketEvent);

    webSocket.enableHeartbeat(15000, 5000, 2);

    webSocket.setReconnectInterval(5000);

    Serial.println("[System] 初始化完成. 等待启动命令...");
    // 确保初始屏幕是停止状态
    updateDisplay(NAN, NAN, -1, false, isRunning); // 显示初始停止画面
}  

void loop() {  
    unsigned long currentMillis = millis();
    
    // 按钮防抖逻辑
    int reading = digitalRead(BUTTON_PIN);
    if (reading != lastButtonState) {
        lastDebounceTime = currentMillis;
    }
    if ((currentMillis - lastDebounceTime) > debounceDelay) {
        if (reading != currentButtonState) {
            currentButtonState = reading;
            if (currentButtonState == LOW) { // 检测到稳定按下状态
                isRunning = !isRunning; // 切换状态
                Serial.printf("[Control] 按钮按下，状态切换为: %s\n", isRunning ? "监控中" : "已停止");

                if (isRunning) {
                    // 切换到运行
                    Serial.println("[System] 开始监控...");
                    // 尝试连接WebSocket (如果WiFi已连接)
                    if (WiFi.status() == WL_CONNECTED) {
                         Serial.println("[WebSocket] 首次初始连接...");
                         webSocket.begin(wsHost, wsPort, wsPath); // 首次连接尝试初始
                         lastReconnectAttempt = currentMillis;
                    } else {
                         Serial.println("[Warn] WiFi 未连接，无法连接 WebSocket");
                         // isRunning 依然为 true, 等待 WiFi 恢复
                    }
                } else {
                    // 切换到停止
                    Serial.println("[System] 停止监控...");
                    if (wsConnected) {
                        webSocket.disconnect(); // 手动断开
                        Serial.println("[WebSocket] 已手动断开");
                    }
                    digitalWrite(BUZZER_PIN, LOW); // 关闭蜂鸣器
                    wsConnected = false; // 确保状态同步
                }
                 // 状态切换后即时更新显示
                updateDisplay(NAN, NAN, -1, false, isRunning);
                lastDisplayUpdateTime = currentMillis;
            }
        }
    }
    lastButtonState = reading; // 保存上次读取的状态

    if (isRunning) {
        // 调用内部 webSocket.loop()
        webSocket.loop();

        if (WiFi.status() != WL_CONNECTED) {
            Serial.println("[WiFi] Warn: 连接丢失! 等待自动重连后WebSocket将处理...");
            wifiReconnectDisplayUntil = currentMillis + 2000;
            // WiFi断开后WebSocket依然断开，关闭可能的警鸣
            if(wsConnected) { // 如果 wsConnected 仍没有被回调事件改false
                 wsConnected = false; // 手动改false，避免悖论发生
                 Serial.println("[System] WiFi丢失，标记WebSocket为断开");
            }
            digitalWrite(BUZZER_PIN, LOW);
        }

        if (WiFi.status() == WL_CONNECTED) {
            tryReconnectWebSocket(); // 其会内部检查 isRunning 和 wsConnected
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
                
                // 添加实际时间戳
                struct tm timeinfo;
                if(getLocalTime(&timeinfo)) {
                    char timeString[30];
                    sprintf(timeString, "%04d-%02d-%02d %02d:%02d:%02d", 
                            timeinfo.tm_year + 1900, timeinfo.tm_mon + 1, timeinfo.tm_mday,
                            timeinfo.tm_hour, timeinfo.tm_min, timeinfo.tm_sec);
                    doc["timestamp"] = timeString;
                }
                
                doc["type"] = "emit";

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
        // 如果此时段没有发送数据，且WS未连接，仍应刷新一下屏幕
        else if (currentMillis - lastDisplayUpdateTime > 1000) {
             float temp_dummy = dht.readTemperature(true); // 尝试读取用来显示
             int light_dummy = readLightLevel();
             updateDisplay(temp_dummy, NAN, light_dummy, false, isRunning);
             lastDisplayUpdateTime = currentMillis;
        }
    } else {
        // 停止状态逻辑
        digitalWrite(BUZZER_PIN, LOW); // 确保蜂鸣器关闭

        // 周期性更新停止画面
        if (currentMillis - lastDisplayUpdateTime > 1000) {
             updateDisplay(NAN, NAN, -1, false, isRunning);
             lastDisplayUpdateTime = currentMillis;
        }
    }

    delay(10);
} 