#include <WiFi.h>  
#include <DHT.h>  
#include <WebSocketsClient.h>
#include <ArduinoJson.h>
#include <time.h>
#include <Wire.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>

// OLED��ʾ��Ļ
#define SCREEN_WIDTH 128    // OLED��ʾ��Ļ�Ŀ���
#define SCREEN_HEIGHT 64    // OLED��ʾ��Ļ�ĸ߶�
#define OLED_RESET -1      // Reset��ť-1��ʾʹ��Arduino��16����
#define SCREEN_ADDRESS 0x3C // OLED��ʾ��ĻI2C��ַ

// I2C����
#define SCL_PIN 22
#define SDA_PIN 21

// �¶���ֵ
// #define TEMP_THRESHOLD 30.0  // �¶���ֵ��Ϊ��̬�����ھ�̬�ж�ʱʹ��
float tempThreshold = 30.0;  // �û�ͨ���ӿ����õ��¶���ֵ���ھ�̬�ж�ʱʹ��

// ��Ļ��ʾ��̬��Ϣ
void updateDisplay(float temperature, float humidity, int lightLevel, bool alarm, bool running);

// OLED��ʾ��Ļ
Adafruit_SSD1306 display(SCREEN_WIDTH, SCREEN_HEIGHT, &Wire, OLED_RESET);

// WiFi����
const char* ssid = "PPX";  
const char* password = "a1668692058";  

// WebSocket����
const char* wsHost = "192.168.211.197";  // Ŀ��IP
const uint16_t wsPort = 8380;
const char* wsPath = "/env";  // ʹ��·��

// NTP����
const char* ntpServer = "pool.ntp.org";
const long  gmtOffset_sec = 8 * 3600; // �й�ʱ��UTC+8
const int   daylightOffset_sec = 0;

// ����������
#define DHT_PIN 17      // DHT11��ʪ�ȴ���������
#define LIGHT_PIN 35    // ����ǿ�ȴ���������(ADC1_CH0)
#define BUZZER_PIN 25   // ����������
#define BUTTON_PIN 18   // ��ť����I2C
#define DHT_TYPE DHT11  

// ADCֵ��Χ
#define LIGHT_MIN 0     // ADC��Сֵ
#define LIGHT_MAX 4095  // ADC���ֵ12λADC

// ��Ļ״̬
volatile bool wsConnected = false;
bool isRunning = false;             // ����״̬��־����ʼΪֹͣ
unsigned long lastReconnectAttempt = 0;
const unsigned long reconnectInterval = 5000;  // �������5��
unsigned long lastDataSendTime = 0;
const unsigned long dataSendInterval = 1000*30;   // ���ݷ��ͼ��2����

unsigned long sensorErrorDisplayUntil = 0; // ������������Ϣ��ʾʱ��
unsigned long wifiReconnectDisplayUntil = 0; // WiFi�Ͽ���ʾ
unsigned long lastDisplayUpdateTime = 0; // ֹͣ״̬��ʾʱ��

// ��ť״̬
unsigned long lastDebounceTime = 0;
unsigned long debounceDelay = 50; // 50ms ȥ��
int lastButtonState = HIGH;      // ��ʼ��ť״̬
int currentButtonState = HIGH;   // ֮ǰ�ȶ�״̬

DHT dht(DHT_PIN, DHT_TYPE);
WebSocketsClient webSocket;

// �ռ������ʹ��������ݺͿ����豸�ĺ���
void collectAndSendSensorData();

// ǿ�Ʋɼ�����������
void forceCollectAndSendData();

// ��ȡ����ǿ�Ȱٷֱ�0-100%
int readLightLevel() {
    int rawValue = analogRead(LIGHT_PIN);
    int lightLevel = map(rawValue, LIGHT_MIN, LIGHT_MAX, 0, 100);
    lightLevel = constrain(lightLevel, 0, 100);
    return lightLevel;
}

// ���Ʒ�����
void controlBuzzer(float temperature) {
    if (isRunning && !isnan(temperature) && temperature > tempThreshold) {
        digitalWrite(BUZZER_PIN, HIGH);
    } else {
        digitalWrite(BUZZER_PIN, LOW);
    }
}

// WebSocket�¼���������
void webSocketEvent(WStype_t type, uint8_t * payload, size_t length) {
    Serial.printf("[Debug] WebSocket�¼�����: %d\n", type);
    
    switch(type) {
        case WStype_DISCONNECTED:
            Serial.printf("[WebSocket] �¼�: �Ͽ�����!\n");
            wsConnected = false;
            break;
        case WStype_CONNECTED:
            Serial.printf("[WebSocket] �¼�: ���ӳɹ�URL: %s\n", payload);
            wsConnected = true;
            break;
        case WStype_TEXT:
            Serial.printf("[WebSocket] �¼�: �յ���Ϣ: %s\n", payload);
            // �����յ���JSON��Ϣ
            {
                StaticJsonDocument<200> doc;
                DeserializationError error = deserializeJson(doc, payload, length);
                
                if (!error) {
                    // �ж��Ƿ���Ч����
                    Serial.println("[Debug] JSON�����ɹ��������������");
                    
                    if (doc.containsKey("type") && doc["type"] == "command") {
                        Serial.println("[Debug] �յ�����������Ϣ");
                        
                        if (doc.containsKey("setThreshold") && doc["setThreshold"].is<float>()) {
                            float newThreshold = doc["setThreshold"].as<float>();
                            Serial.printf("[Debug] �յ��¶���ֵ��������: %.1f\n", newThreshold);
                            
                            // �ж�ֵ�Ƿ�����Ч��Χ��
                            if (newThreshold >= 0 && newThreshold <= 100) {
                                tempThreshold = newThreshold;
                                Serial.printf("[System] �¶���ֵ�Ѹ���Ϊ: %.1f��C\n", tempThreshold);
                                
                                // ����ȷ����Ϣ
                                StaticJsonDocument<100> response;
                                response["type"] = "response";
                                response["status"] = "success";
                                response["message"] = "�¶���ֵ�Ѹ���";
                                response["newThreshold"] = tempThreshold;
                                
                                String jsonResponse;
                                serializeJson(response, jsonResponse);
                                Serial.printf("[Debug] ����ȷ����Ӧ: %s\n", jsonResponse.c_str());
                                webSocket.sendTXT(jsonResponse);
                                
                                // ǿ�Ʋɼ������͵�ǰ����
                                Serial.println("[Debug] ׼��ǿ�Ʋɼ�����������");
                                forceCollectAndSendData();
                                Serial.println("[Debug] ǿ�����ݷ����������");
                            } else {
                                Serial.println("[Error] �յ���Ч���¶���ֵ��Χ!");
                            }
                        }
                    }
                } else {
                    Serial.println("[Error] ����JSON��Ϣʧ��!");
                }
            }
            break;
        case WStype_BIN:
            Serial.printf("[WebSocket] �յ����������ݣ�����: %u\n", length);
            break;
        case WStype_ERROR:
            Serial.printf("[WebSocket] �¼�: ����: %s\n", payload);
            wsConnected = false;
            break;
        case WStype_FRAGMENT_TEXT_START:
        case WStype_FRAGMENT_BIN_START:
        case WStype_FRAGMENT:
        case WStype_FRAGMENT_FIN:
            break;
        case WStype_PING:
            //Serial.println("[WebSocket] �յ� PING");
            break;
        case WStype_PONG:
            //Serial.println("[WebSocket] �յ� PONG");
            break;
    }
}

// ǿ�Ʋɼ�����������
void forceCollectAndSendData() {
    Serial.println("[Debug] ��ʼִ��ǿ�����ݷ��ͺ���");
    Serial.printf("[Debug] WebSocket����״̬: %s\n", wsConnected ? "������" : "δ����");
    
    if (wsConnected) {
        float temperature = dht.readTemperature();  
        float humidity = dht.readHumidity();  
        int lightLevel = readLightLevel();
        unsigned long currentMillis = millis();
        
        Serial.printf("[Debug] ��ȡ����������: �¶�=%.1f, ʪ��=%.1f\n", temperature, humidity);
        
        //�ж��Ƿ���Ч
        bool sensorOk = !isnan(temperature) && !isnan(humidity);
        
        if (!sensorOk) {
            Serial.println("[Error] ǿ�Ʋɼ�ʱ��ȡʧ��! �������¶�ȡ...");
            delay(100); // �����ӳٺ�����
            temperature = dht.readTemperature();
            humidity = dht.readHumidity();
            sensorOk = !isnan(temperature) && !isnan(humidity);
            
            Serial.printf("[Debug] ���¶�ȡ������: �¶�=%.1f, ʪ��=%.1f, ״̬=%s\n", 
                         temperature, humidity, sensorOk ? "�ɹ�" : "ʧ��");
            
            if (!sensorOk) {
                // ��ʹ��ȡʧ�ܣ�Ҳ���Է��Ͳ�������
                temperature = 0;
                humidity = 0;
                Serial.println("[Debug] ʹ��Ĭ��ֵ��������");
            }
        }
        
        // ������ζ���ʾ�ͷ�������
        updateDisplay(temperature, humidity, lightLevel,
                     isRunning && (temperature > tempThreshold), isRunning);
        lastDisplayUpdateTime = currentMillis;
        
        // ����
        StaticJsonDocument<200> doc;
        doc["temperature"] = sensorOk ? temperature : 0;
        doc["humidity"] = sensorOk ? humidity : 0;
        doc["light"] = lightLevel;
        doc["alarm"] = (temperature > tempThreshold);
        doc["threshold"] = tempThreshold;
        doc["sensor_error"] = !sensorOk;  // ���Ӵ����������־
        
        // ��ȡ֮ǰʱ��
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
        
        Serial.printf("[Debug] ׼����������: %s\n", jsonString.c_str());
        
        if (webSocket.sendTXT(jsonString)) {
            Serial.println("[Data] ��ֵ���º�ǿ�Ʒ������ݳɹ�");
        } else {
            Serial.println("[Error] ǿ�Ʒ�������ʧ��!");
        }
    } else {
        Serial.println("[Error] WebSocketδ���ӣ������������Ӻ�������");
        
        // ������������WebSocket
        if (WiFi.status() == WL_CONNECTED) {
            Serial.println("[Debug] WiFi�����ӣ���������WebSocket...");
            webSocket.begin(wsHost, wsPort, wsPath);
            delay(500); // ���ݵȴ�����
            webSocket.loop(); // ����һ��WebSocket�¼�
            
            // �ٴμ������״̬
            if (wsConnected) {
                Serial.println("[Debug] WebSocket�����ɹ������µ������ݷ��ͺ���");
                // �ݹ������������ֻ�ܵݹ�һ��
                forceCollectAndSendData();
            } else {
                Serial.println("[Error] WebSocket����ʧ��");
            }
        } else {
            Serial.println("[Error] WiFiδ���ӣ��޷���������");
        }
    }
}

// �ռ������ʹ��������� (�ռ�״̬ʱ����)
void collectAndSendSensorData() {
    if (isRunning && wsConnected) {
        float temperature = dht.readTemperature();  
        float humidity = dht.readHumidity();  
        int lightLevel = readLightLevel();
        unsigned long currentMillis = millis();

        bool sensorOk = true;
        if (isnan(temperature) || isnan(humidity)) {  
            Serial.println("[Error] �޷���ȡ��ʪ�ȴ�����!");  
            sensorErrorDisplayUntil = currentMillis + 2000;
            sensorOk = false;
            return;
        }  

        controlBuzzer(temperature);

        updateDisplay(temperature, humidity, lightLevel,
                      sensorOk && (temperature > tempThreshold), isRunning);
        lastDisplayUpdateTime = currentMillis;

        if (sensorOk) {
            StaticJsonDocument<200> doc;
            doc["temperature"] = temperature;
            doc["humidity"] = humidity;
            doc["light"] = lightLevel;
            doc["alarm"] = (temperature > tempThreshold);
            doc["threshold"] = tempThreshold; // Ҳ����ʹ��֮ǰֵ
            
            // ��ȡ֮ǰʱ��
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

            if (webSocket.sendTXT(jsonString)) {
                Serial.println("[Data] �ռ������ʹ��������ݳɹ�");
            } else {
                Serial.println("[Error] WebSocket �ռ������ʹ���������ʧ�ܻ�Ͽ�!");
            }
        }
    }
}

// ������������WebSocket
void tryReconnectWebSocket() {
    if (isRunning && WiFi.status() == WL_CONNECTED && !wsConnected && (millis() - lastReconnectAttempt > reconnectInterval)) {
        Serial.println("[WebSocket] ������������...");
        webSocket.begin(wsHost, wsPort, wsPath);
        lastReconnectAttempt = millis();
    }
}

// ��Ļ��ʾ
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
    Serial.begin(115200);  // ѡ�񴮿�
    while (!Serial); // �ȴ����ڳ�ʼ����� (��ѡ)
    Serial.println("\n[System] ��ʼ...");  

    // ��ʼ��I2C
    Wire.begin(SDA_PIN, SCL_PIN);
    
    // ��ʼ��OLED��Ļ
    if(!display.begin(SSD1306_SWITCHCAPVCC, SCREEN_ADDRESS)) {
        Serial.println(F("[Error] SSD1306 ��ʼ��ʧ��"));
        for(;;);
    }
    
    // ����OLED��Ļ�Աȶȣ�ѡ��
    display.ssd1306_command(SSD1306_SETCONTRAST);
    display.ssd1306_command(128); // �Աȶ�Ϊ���
    
    display.clearDisplay();
    display.setTextSize(1);
    display.setTextColor(SSD1306_WHITE);
    display.setCursor(0,0);
    display.println("Initializing...");
    display.display();
    delay(1000);  // �ȴ���ʼ�������ʾ

    // ��ʼ��������
    dht.begin();
    pinMode(LIGHT_PIN, INPUT);
    pinMode(BUZZER_PIN, OUTPUT);
    digitalWrite(BUZZER_PIN, LOW);
    pinMode(BUTTON_PIN, INPUT_PULLUP); // ��ʼ����ť

    // ����WiFi  
    Serial.print("[WiFi] ���ӵ�: ");
    Serial.println(ssid);
    display.clearDisplay();
    display.setCursor(0,10);
    display.print("Connecting WiFi...");
    display.display();
    
    WiFi.mode(WIFI_STA);
    WiFi.begin(ssid, password);  
    unsigned long wifiStart = millis();
    while (WiFi.status() != WL_CONNECTED && millis() - wifiStart < 20000) { // 20�볬ʱ
        delay(500);  
        Serial.print(".");
        display.print(".");
        display.display();
    }  
    
    if (WiFi.status() == WL_CONNECTED) {  
        Serial.println("\n[WiFi] ���ӳɹ�!");  
        Serial.print("[WiFi] IP ��ַ: ");
        Serial.println(WiFi.localIP());
        display.clearDisplay();
        display.setCursor(0,0);
        display.println("WiFi Connected!");
        display.println(WiFi.localIP().toString());
        
        // ����NTP
        configTime(gmtOffset_sec, daylightOffset_sec, ntpServer);
        Serial.println("[NTP] ʱ��ͬ��...");
        
        display.setCursor(0, 30); 
        display.println("Press button to start...");
        display.display();
        delay(1000);
    } else {  
        Serial.println("\n[Error] WiFi ����ʧ��!");  
        display.clearDisplay();
        display.setCursor(0,0);
        display.println("WiFi Failed!");
        display.display();
        while(1) delay(1000); // ��ʱ��ֹͣ����
    }
    
    // ����WebSocket
    webSocket.onEvent(webSocketEvent);

    webSocket.enableHeartbeat(15000, 5000, 2);

    webSocket.setReconnectInterval(5000);

    Serial.println("[System] ��ʼ... �ȴ���Ļ״̬...");
    // ȷ����ʼ��Ļ״̬Ϊֹͣ״̬
    updateDisplay(NAN, NAN, -1, false, isRunning); // ��ʾ��ʼֹͣ״̬
}  

void loop() {  
    unsigned long currentMillis = millis();
    
    // ��ť״̬��ȡ
    int reading = digitalRead(BUTTON_PIN);
    if (reading != lastButtonState) {
        lastDebounceTime = currentMillis;
    }
    if ((currentMillis - lastDebounceTime) > debounceDelay) {
        if (reading != currentButtonState) {
            currentButtonState = reading;
            if (currentButtonState == LOW) { // �ȶ�״̬
                isRunning = !isRunning; // ״̬�л�
                Serial.printf("[Control] ��ť���£�״̬�л�Ϊ: %s\n", isRunning ? "����" : "ֹͣ");

                if (isRunning) {
                    // ��ʼ����
                    Serial.println("[System] ��ʼ...");
                    // ����WebSocket (��ҪWiFi����)
                    if (WiFi.status() == WL_CONNECTED) {
                         Serial.println("[WebSocket] ����...");
                         webSocket.begin(wsHost, wsPort, wsPath); // ����WebSocket
                         lastReconnectAttempt = currentMillis;
                    } else {
                         Serial.println("[Warn] WiFiδ���ӣ��޷����� WebSocket");
                         // isRunning ��Ϊ true, �ȴ� WiFi ����
                    }
                } else {
                    // ֹͣ����
                    Serial.println("[System] ֹͣ...");
                    if (wsConnected) {
                        webSocket.disconnect(); // �Ͽ�����
                        Serial.println("[WebSocket] �Ͽ�����");
                    }
                    digitalWrite(BUZZER_PIN, LOW); // ȷ���رշ�����
                    wsConnected = false; // ȷ��״̬һ��
                }
                 // ״̬�仯ʱ��ʾ
                updateDisplay(NAN, NAN, -1, false, isRunning);
                lastDisplayUpdateTime = currentMillis;
            }
        }
    }
    lastButtonState = reading; // ��ȡ�ȶ�״̬

    if (isRunning) {
        // �ڲ�ѭ�� webSocket.loop()
        webSocket.loop();

        if (WiFi.status() != WL_CONNECTED) {
            Serial.println("[WiFi] Warn: ���ӶϿ�! �ȴ��Զ�����WebSocket...");
            wifiReconnectDisplayUntil = currentMillis + 2000;
            // WiFi�Ͽ�WebSocket�Զ��Ͽ�
            if(wsConnected) { // ��� wsConnected û���յ��Ͽ��ź�Ϊfalse
                 wsConnected = false; // �Ͽ��ź�Ϊfalse��ֹ�ظ��Ͽ�
                 Serial.println("[System] WiFi�Ͽ�WebSocketΪ�Ͽ�");
            }
            digitalWrite(BUZZER_PIN, LOW);
        }

        if (WiFi.status() == WL_CONNECTED) {
            tryReconnectWebSocket(); // �ڲ�ѭ�� isRunning �� wsConnected
        }

        // ʱ���жϷ���
        if (wsConnected && (currentMillis - lastDataSendTime >= dataSendInterval)) {
            collectAndSendSensorData();
            lastDataSendTime = currentMillis;
        }
        // ֮ǰû�з������ݣ�WS�Ͽ�Ӧ��ʾһ����Ļ
        else if (currentMillis - lastDisplayUpdateTime > 1000) {
             float temp_dummy = dht.readTemperature(true); // �Զ���ȡ�¶���ʾ
             int light_dummy = readLightLevel();
             updateDisplay(temp_dummy, NAN, light_dummy, false, isRunning);
             lastDisplayUpdateTime = currentMillis;
        }
    } else {
        // ֹͣ״̬
        digitalWrite(BUZZER_PIN, LOW); // ȷ���رշ�����

        // ֮ǰû�з������ݣ�Ӧ��ʾֹͣ״̬
        if (currentMillis - lastDisplayUpdateTime > 1000) {
             updateDisplay(NAN, NAN, -1, false, isRunning);
             lastDisplayUpdateTime = currentMillis;
        }
    }

    delay(10);
} 