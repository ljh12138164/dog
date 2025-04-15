#include <WiFi.h>
#include <DHT.h>
#include <WebSocketsClient.h>
#include <ArduinoJson.h>
#include <time.h>
#include <Wire.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>

// OLED显示屏幕
#define SCREEN_WIDTH 128    // OLED显示屏幕的宽度
#define SCREEN_HEIGHT 64    // OLED显示屏幕的高度
#define OLED_RESET -1       // Reset按钮-1表示使用Arduino的16脚
#define SCREEN_ADDRESS 0x3C // OLED显示屏幕I2C地址

// I2C引脚
#define SCL_PIN 22
#define SDA_PIN 21

// 温度阈值
// #define TEMP_THRESHOLD 30.0  // 温度阈值作为静态常量在静态判断时使用
float tempThreshold = 30.0; // 用户通过串口输入的温度阈值在静态判断时使用

// 显示静态信息
void updateDisplay(float temperature, float humidity, int lightLevel, bool alarm, bool running);

// OLED显示屏幕
Adafruit_SSD1306 display(SCREEN_WIDTH, SCREEN_HEIGHT, &Wire, OLED_RESET);

// WiFi连接
const char *ssid = "PPX";
const char *password = "a1668692058";

// WebSocket连接
const char *wsHost = "192.168.205.197"; // 目标IP
const uint16_t wsPort = 8380;
const char *wsPath = "/env"; // 使用路径

// NTP连接
const char *ntpServer = "pool.ntp.org";
const long gmtOffset_sec = 8 * 3600; // 中国时区UTC+8
const int daylightOffset_sec = 0;

// 传感器引脚
#define DHT_PIN 17    // DHT11温湿度传感器连接
#define LIGHT_PIN 35  // 光照传感器连接(ADC1_CH0)
#define BUZZER_PIN 25 // 蜂鸣器连接
#define BUTTON_PIN 18 // 按钮连接I2C
#define DHT_TYPE DHT11

// ADC值范围
#define LIGHT_MIN 0    // ADC最小值
#define LIGHT_MAX 4095 // ADC最大值12位ADC

// 屏幕状态
volatile bool wsConnected = false;
bool isRunning = false; // 运行状态标志，初始为停止
unsigned long lastReconnectAttempt = 0;
const unsigned long reconnectInterval = 5000; // 重连间隔5秒
unsigned long lastDataSendTime = 0;
const unsigned long dataSendInterval = 1000 * 10; // 数据发送间隔2分钟

unsigned long sensorErrorDisplayUntil = 0;   // 传感器错误信息显示时间
unsigned long wifiReconnectDisplayUntil = 0; // WiFi断开显示
unsigned long lastDisplayUpdateTime = 0;     // 停止状态显示时间

// 按钮状态
unsigned long lastDebounceTime = 0;
unsigned long debounceDelay = 50; // 50ms 去抖
int lastButtonState = HIGH;       // 初始按钮状态
int currentButtonState = HIGH;    // 之前稳定状态

DHT dht(DHT_PIN, DHT_TYPE);
WebSocketsClient webSocket;

// 收集并发送传感器数据和设备信息的函数
void collectAndSendSensorData();

// 强制收集并发送数据
void forceCollectAndSendData();

// 读取光照百分比0-100%
int readLightLevel()
{
    int rawValue = analogRead(LIGHT_PIN);
    int lightLevel = map(rawValue, LIGHT_MIN, LIGHT_MAX, 0, 100);
    lightLevel = constrain(lightLevel, 0, 100);
    return lightLevel;
}

// 控制蜂鸣器
void controlBuzzer(float temperature)
{
    if (isRunning && !isnan(temperature) && temperature > tempThreshold)
    {
        digitalWrite(BUZZER_PIN, HIGH);
    }
    else
    {
        digitalWrite(BUZZER_PIN, LOW);
    }
}

// WebSocket事件处理函数
void webSocketEvent(WStype_t type, uint8_t *payload, size_t length)
{
    Serial.printf("[Debug] WebSocket事件: %d\n", type);

    switch (type)
    {
    case WStype_DISCONNECTED:
        Serial.printf("[WebSocket] 事件: 断开连接!\n");
        wsConnected = false;
        break;
    case WStype_CONNECTED:
        Serial.printf("[WebSocket] 事件: 连接成功URL: %s\n", payload);
        wsConnected = true;
        break;
    case WStype_TEXT:
        Serial.printf("[WebSocket] 事件: 收到信息: %s\n", payload);
        // 解析收到JSON信息
        {
            StaticJsonDocument<200> doc;
            DeserializationError error = deserializeJson(doc, payload, length);

            if (!error)
            {
                // 判断是否有效
                Serial.println("[Debug] JSON解析成功，解析到数据");

                if (doc.containsKey("type") && doc["type"] == "command")
                {
                    Serial.println("[Debug] 收到控制命令信息");

                    if (doc.containsKey("setThreshold") && doc["setThreshold"].is<float>())
                    {
                        float newThreshold = doc["setThreshold"].as<float>();
                        Serial.printf("[Debug] 收到新的温度阈值: %.1f\n", newThreshold);

                        // 判断值是否在有效范围内
                        if (newThreshold >= 0 && newThreshold <= 100)
                        {
                            tempThreshold = newThreshold;
                            Serial.printf("[System] 温度阈值已更新为: %.1f°C\n", tempThreshold);

                            // 返回正确响应信息
                            StaticJsonDocument<100> response;
                            response["type"] = "response";
                            response["status"] = "success";
                            response["message"] = "温度阈值已更新";
                            response["newThreshold"] = tempThreshold;

                            String jsonResponse;
                            serializeJson(response, jsonResponse);
                            Serial.printf("[Debug] 返回正确响应: %s\n", jsonResponse.c_str());
                            webSocket.sendTXT(jsonResponse);

                            // 强制收集并发送数据到之前的状态
                            Serial.println("[Debug] 准备强制收集并发送数据到之前的状态");
                            forceCollectAndSendData();
                            Serial.println("[Debug] 强制收集并发送数据完成");
                        }
                        else
                        {
                            Serial.println("[Error] 收到无效的温度阈值范围!");
                        }
                    }
                }
            }
            else
            {
                Serial.println("[Error] 解析JSON信息失败!");
            }
        }
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
        // Serial.println("[WebSocket] 收到 PING");
        break;
    case WStype_PONG:
        // Serial.println("[WebSocket] 收到 PONG");
        break;
    }
}

// 强制收集并发送数据
void forceCollectAndSendData()
{
    Serial.println("[Debug] 开始执行强制收集并发送数据到WebSocket");
    Serial.printf("[Debug] WebSocket连接状态: %s\n", wsConnected ? "已连接" : "未连接");

    if (wsConnected)
    {
        float temperature = dht.readTemperature();
        float humidity = dht.readHumidity();
        int lightLevel = readLightLevel();
        unsigned long currentMillis = millis();

        Serial.printf("[Debug] 获取传感器数据: 温度=%.1f, 湿度=%.1f\n", temperature, humidity);

        // 判断是否有效
        bool sensorOk = !isnan(temperature) && !isnan(humidity);

        if (!sensorOk)
        {
            Serial.println("[Error] 强制收集并发送数据时读取失败! 尝试重新读取...");
            delay(100); // 等待一下再读取
            temperature = dht.readTemperature();
            humidity = dht.readHumidity();
            sensorOk = !isnan(temperature) && !isnan(humidity);

            Serial.printf("[Debug] 重新读取后: 温度=%.1f, 湿度=%.1f, 状态=%s\n",
                          temperature, humidity, sensorOk ? "成功" : "失败");

            if (!sensorOk)
            {
                // 如果读取失败，也放弃发送数据
                temperature = 0;
                humidity = 0;
                Serial.println("[Debug] 使用默认值发送数据");
            }
        }

        // 更新屏幕显示和控制蜂鸣器
        updateDisplay(temperature, humidity, lightLevel,
                      isRunning && (temperature > tempThreshold), isRunning);
        lastDisplayUpdateTime = currentMillis;

        // 发送
        StaticJsonDocument<200> doc;
        doc["temperature"] = sensorOk ? temperature : 0;
        doc["humidity"] = sensorOk ? humidity : 0;
        doc["light"] = lightLevel;
        doc["alarm"] = (temperature > tempThreshold);
        doc["threshold"] = tempThreshold;
        doc["sensor_error"] = !sensorOk; // 添加传感器错误标志

        // 获取之前时间
        struct tm timeinfo;
        if (getLocalTime(&timeinfo))
        {
            char timeString[30];
            sprintf(timeString, "%04d-%02d-%02d %02d:%02d:%02d",
                    timeinfo.tm_year + 1900, timeinfo.tm_mon + 1, timeinfo.tm_mday,
                    timeinfo.tm_hour, timeinfo.tm_min, timeinfo.tm_sec);
            doc["timestamp"] = timeString;
        }

        doc["type"] = "emit";

        String jsonString;
        serializeJson(doc, jsonString);

        Serial.printf("[Debug] 准备发送数据: %s\n", jsonString.c_str());

        if (webSocket.sendTXT(jsonString))
        {
            Serial.println("[Data] 发送数据到WebSocket成功");
        }
        else
        {
            Serial.println("[Error] 发送数据到WebSocket失败!");
        }
    }
    else
    {
        Serial.println("[Error] WebSocket未连接，无法发送数据到WebSocket和设备");

        // 尝试重新连接WebSocket
        if (WiFi.status() == WL_CONNECTED)
        {
            Serial.println("[Debug] WiFi已连接，尝试连接WebSocket...");
            webSocket.begin(wsHost, wsPort, wsPath);
            delay(500);       // 等待一段时间
            webSocket.loop(); // 执行一次WebSocket事件

            // 再次检查连接状态
            if (wsConnected)
            {
                Serial.println("[Debug] WebSocket连接成功，发送数据到WebSocket和设备");
                // 递归调用，只能递归一次
                forceCollectAndSendData();
            }
            else
            {
                Serial.println("[Error] WebSocket连接失败");
            }
        }
        else
        {
            Serial.println("[Error] WiFi未连接，无法发送数据到WebSocket和设备");
        }
    }
}

// 收集并发送传感器数据 (静态状态时)
void collectAndSendSensorData()
{
    if (isRunning && wsConnected)
    {
        float temperature = dht.readTemperature();
        float humidity = dht.readHumidity();
        int lightLevel = readLightLevel();
        unsigned long currentMillis = millis();

        bool sensorOk = true;
        if (isnan(temperature) || isnan(humidity))
        {
            Serial.println("[Error] 无法读取温湿度传感器!");
            sensorErrorDisplayUntil = currentMillis + 2000;
            sensorOk = false;
            return;
        }

        controlBuzzer(temperature);

        updateDisplay(temperature, humidity, lightLevel,
                      sensorOk && (temperature > tempThreshold), isRunning);
        lastDisplayUpdateTime = currentMillis;

        if (sensorOk)
        {
            StaticJsonDocument<200> doc;
            doc["temperature"] = temperature;
            doc["humidity"] = humidity;
            doc["light"] = lightLevel;
            doc["alarm"] = (temperature > tempThreshold);
            doc["threshold"] = tempThreshold; // 也可以使用之前值

            // 获取之前时间
            struct tm timeinfo;
            if (getLocalTime(&timeinfo))
            {
                char timeString[30];
                sprintf(timeString, "%04d-%02d-%02d %02d:%02d:%02d",
                        timeinfo.tm_year + 1900, timeinfo.tm_mon + 1, timeinfo.tm_mday,
                        timeinfo.tm_hour, timeinfo.tm_min, timeinfo.tm_sec);
                doc["timestamp"] = timeString;
            }

            doc["type"] = "emit";

            String jsonString;
            serializeJson(doc, jsonString);

            if (webSocket.sendTXT(jsonString))
            {
                Serial.println("[Data] 收集并发送传感器数据到WebSocket成功");
            }
            else
            {
                Serial.println("[Error] WebSocket 收集并发送传感器数据失败或已断开!");
            }
        }
    }
}

// 尝试重新连接WebSocket
void tryReconnectWebSocket()
{
    if (isRunning && WiFi.status() == WL_CONNECTED && !wsConnected && (millis() - lastReconnectAttempt > reconnectInterval))
    {
        Serial.println("[WebSocket] 尝试重新连接...");
        webSocket.begin(wsHost, wsPort, wsPath);
        lastReconnectAttempt = millis();
    }
}

// 屏幕显示
void updateDisplay(float temperature, float humidity, int lightLevel, bool alarm, bool running)
{
    display.clearDisplay();
    display.setTextSize(1);
    display.setTextColor(SSD1306_WHITE);

    display.setCursor(0, 0);
    display.print("Status: ");
    display.print(running ? "Running" : "Stopped");

    if (running)
    {
        display.setCursor(0, 10);
        display.print("T:");
        if (isnan(temperature))
            display.print("ERR");
        else
            display.print(temperature, 1);
        display.setCursor(64, 10);
        display.print(" H:");
        if (isnan(humidity))
            display.print("ERR");
        else
            display.print(humidity, 1);

        display.setCursor(0, 20);
        display.print("L:");
        if (lightLevel < 0)
            display.print("--");
        else
            display.print(lightLevel);
        display.print("%");

        if (alarm)
        {
            display.setCursor(64, 20);
            display.setTextColor(SSD1306_BLACK, SSD1306_WHITE);
            display.print(" ALARM! ");
            display.setTextColor(SSD1306_WHITE);
        }

        if (millis() < sensorErrorDisplayUntil)
        {
            display.setCursor(0, 50);
            display.setTextColor(SSD1306_BLACK, SSD1306_WHITE);
            display.print(" Sensor ERROR! ");
            display.setTextColor(SSD1306_WHITE);
        }
        else if (millis() < wifiReconnectDisplayUntil)
        {
            display.setCursor(0, 50);
            display.setTextColor(SSD1306_BLACK, SSD1306_WHITE);
            display.print(" WiFi Check... ");
            display.setTextColor(SSD1306_WHITE);
        }
    }
    else
    {
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

    if (wifiStatus == WL_CONNECTED)
    {
        display.setCursor(SCREEN_WIDTH - 30, SCREEN_HEIGHT - 8);
        display.print(WiFi.localIP().toString().substring(WiFi.localIP().toString().lastIndexOf('.') + 1));
    }

    display.display();
}

void setup()
{
    Serial.begin(115200); // 选择波特率
    while (!Serial)
        ; // 等待串口初始化完成 (可选)
    Serial.println("\n[System] 初始...");

    // 初始化I2C
    Wire.begin(SDA_PIN, SCL_PIN);

    // 初始化OLED屏幕
    if (!display.begin(SSD1306_SWITCHCAPVCC, SCREEN_ADDRESS))
    {
        Serial.println(F("[Error] SSD1306 初始化失败"));
        for (;;)
            ;
    }

    // 设置OLED屏幕对比度，选择
    display.ssd1306_command(SSD1306_SETCONTRAST);
    display.ssd1306_command(128); // 对比度为最大

    display.clearDisplay();
    display.setTextSize(1);
    display.setTextColor(SSD1306_WHITE);
    display.setCursor(0, 0);
    display.println("Initializing...");
    display.display();
    delay(1000); // 等待初始化屏幕显示

    // 初始化传感器
    dht.begin();
    pinMode(LIGHT_PIN, INPUT);
    pinMode(BUZZER_PIN, OUTPUT);
    digitalWrite(BUZZER_PIN, LOW);
    pinMode(BUTTON_PIN, INPUT_PULLUP); // 初始化按钮

    // 连接WiFi
    Serial.print("[WiFi] 连接到: ");
    Serial.println(ssid);
    display.clearDisplay();
    display.setCursor(0, 10);
    display.print("Connecting WiFi...");
    display.display();

    WiFi.mode(WIFI_STA);
    WiFi.begin(ssid, password);
    unsigned long wifiStart = millis();
    while (WiFi.status() != WL_CONNECTED && millis() - wifiStart < 20000)
    { // 20秒超时
        delay(500);
        Serial.print(".");
        display.print(".");
        display.display();
    }

    if (WiFi.status() == WL_CONNECTED)
    {
        Serial.println("\n[WiFi] 连接成功!");
        Serial.print("[WiFi] IP 地址: ");
        Serial.println(WiFi.localIP());
        display.clearDisplay();
        display.setCursor(0, 0);
        display.println("WiFi Connected!");
        display.println(WiFi.localIP().toString());

        // 连接NTP
        configTime(gmtOffset_sec, daylightOffset_sec, ntpServer);
        Serial.println("[NTP] 时间同步...");

        display.setCursor(0, 30);
        display.println("Press button to start...");
        display.display();
        delay(1000);
    }
    else
    {
        Serial.println("\n[Error] WiFi 连接失败!");
        display.clearDisplay();
        display.setCursor(0, 0);
        display.println("WiFi Failed!");
        display.display();
        while (1)
            delay(1000); // 长时间停止程序
    }

    // 连接WebSocket
    webSocket.onEvent(webSocketEvent);

    webSocket.enableHeartbeat(15000, 5000, 2);

    webSocket.setReconnectInterval(5000);

    Serial.println("[System] 初始... 等待屏幕状态...");
    // 确保初始屏幕状态为停止状态
    updateDisplay(NAN, NAN, -1, false, isRunning); // 显示初始停止状态

    // 添加自启动功能
    Serial.println("[System] 启用自启动...");
    isRunning = true; // 自动设置为运行状态

    // 自动连接WebSocket
    if (WiFi.status() == WL_CONNECTED)
    {
        Serial.println("[WebSocket] 自动连接...");
        webSocket.begin(wsHost, wsPort, wsPath);
        lastReconnectAttempt = millis();

        // 更新显示为运行状态
        updateDisplay(NAN, NAN, -1, false, isRunning);
        lastDisplayUpdateTime = millis();
    }
}

void loop()
{
    unsigned long currentMillis = millis();

    // 按钮状态读取
    int reading = digitalRead(BUTTON_PIN);
    if (reading != lastButtonState)
    {
        lastDebounceTime = currentMillis;
    }
    if ((currentMillis - lastDebounceTime) > debounceDelay)
    {
        if (reading != currentButtonState)
        {
            currentButtonState = reading;
            if (currentButtonState == LOW)
            {                           // 稳定状态
                isRunning = !isRunning; // 状态切换
                Serial.printf("[Control] 按钮按下，状态切换为: %s\n", isRunning ? "运行" : "停止");

                if (isRunning)
                {
                    // 开始运行
                    Serial.println("[System] 开始...");
                    // 连接WebSocket (需要WiFi连接)
                    if (WiFi.status() == WL_CONNECTED)
                    {
                        Serial.println("[WebSocket] 连接...");
                        webSocket.begin(wsHost, wsPort, wsPath); // 连接WebSocket
                        lastReconnectAttempt = currentMillis;
                    }
                    else
                    {
                        Serial.println("[Warn] WiFi未连接，无法连接 WebSocket");
                        // isRunning 设为 true, 等待 WiFi 连接
                    }
                }
                else
                {
                    // 停止运行
                    Serial.println("[System] 停止...");
                    if (wsConnected)
                    {
                        webSocket.disconnect(); // 断开连接
                        Serial.println("[WebSocket] 断开连接");
                    }
                    digitalWrite(BUZZER_PIN, LOW); // 确保关闭蜂鸣器
                    wsConnected = false;           // 确保状态一致
                }
                // 状态变化时显示
                updateDisplay(NAN, NAN, -1, false, isRunning);
                lastDisplayUpdateTime = currentMillis;
            }
        }
    }
    lastButtonState = reading; // 获取稳定状态

    if (isRunning)
    {
        // 内部循环 webSocket.loop()
        webSocket.loop();

        if (WiFi.status() != WL_CONNECTED)
        {
            Serial.println("[WiFi] Warn: 断开连接! 等待自动重连WebSocket...");
            wifiReconnectDisplayUntil = currentMillis + 2000;
            // WiFi断开WebSocket自动断开
            if (wsConnected)
            {                        // 如果 wsConnected 没有收到断开信号为false
                wsConnected = false; // 断开信号为false防止重复断开
                Serial.println("[System] WiFi断开WebSocket为断开");
            }
            digitalWrite(BUZZER_PIN, LOW);
        }

        if (WiFi.status() == WL_CONNECTED)
        {
            tryReconnectWebSocket(); // 内部循环 isRunning 和 wsConnected
        }

        // 时间判断发送
        if (wsConnected && (currentMillis - lastDataSendTime >= dataSendInterval))
        {
            collectAndSendSensorData();
            lastDataSendTime = currentMillis;
        }
        // 之前没有发送数据，WS断开应显示一次屏幕
        else if (currentMillis - lastDisplayUpdateTime > 1000)
        {
            float temp_dummy = dht.readTemperature(true); // 自动读取温度显示
            int light_dummy = readLightLevel();
            updateDisplay(temp_dummy, NAN, light_dummy, false, isRunning);
            lastDisplayUpdateTime = currentMillis;
        }
    }
    else
    {
        // 停止状态
        digitalWrite(BUZZER_PIN, LOW); // 确保关闭蜂鸣器

        // 之前没有发送数据，应显示停止状态
        if (currentMillis - lastDisplayUpdateTime > 1000)
        {
            updateDisplay(NAN, NAN, -1, false, isRunning);
            lastDisplayUpdateTime = currentMillis;
        }
    }

    delay(10);
}