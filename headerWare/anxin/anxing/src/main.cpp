#include <WiFi.h>  
#include <DHT.h>  
#include <WebSocketsClient.h>
#include <ArduinoJson.h>
#include <time.h>
#include <Wire.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>

// OLED��ʾ������
#define SCREEN_WIDTH 128    // OLED��ʾ����ȣ���λ���ص�
#define SCREEN_HEIGHT 64    // OLED��ʾ���߶ȣ���λ���ص�
#define OLED_RESET -1      // Reset���ţ�-1��ʾʹ��Arduino�ĸ�λ����
#define SCREEN_ADDRESS 0x3C // OLED��ʾ����I2C��ַ

// I2C���Ŷ���
#define SCL_PIN 22
#define SDA_PIN 21

// ������ʾ������
Adafruit_SSD1306 display(SCREEN_WIDTH, SCREEN_HEIGHT, &Wire, OLED_RESET);

// WiFi����  
const char* ssid = "PPX";  
const char* password = "a1668692058";  

// WebSocket����������
const char* wsHost = "192.168.177.197";  // ��ķ�����IP
const uint16_t wsPort = 8380;
const char* wsPath = "/env";  // ʹ�ø�·��

// NTP����������
const char* ntpServer = "pool.ntp.org";
const long  gmtOffset_sec = 8 * 3600; // �й�ʱ��UTC+8
const int   daylightOffset_sec = 0;

// ��������������  
#define DHT_PIN 17      // DHT11��ʪ�ȴ���������
#define LIGHT_PIN 35    // ���մ���������(ADC1_CH0)
#define BUZZER_PIN 25   // ����������
#define BUTTON_PIN 18   // ��ť�������Ŷ���
#define DHT_TYPE DHT11  

// ����ǿ��ӳ�䷶Χ
#define LIGHT_MIN 0     // ADC��Сֵ
#define LIGHT_MAX 4095  // ADC���ֵ��12λADC��

// �¶Ⱦ�����ֵ
#define TEMP_THRESHOLD 30.0  // �¶Ⱦ�����ֵ�����϶ȣ�

// ����״̬
volatile bool wsConnected = false;
bool isRunning = false;             // �������״̬��־����ʼΪֹͣ
unsigned long lastReconnectAttempt = 0;
const unsigned long reconnectInterval = 5000;  // �������5��
unsigned long lastDataSendTime = 0;
const unsigned long dataSendInterval = 1000*30;   // ���ݷ��ͼ��2��

unsigned long sensorErrorDisplayUntil = 0; // ���ڶ�������ʾ������Ϣ
unsigned long wifiReconnectDisplayUntil = 0; // ���ڶ�������ʾWiFi����
unsigned long lastDisplayUpdateTime = 0; // ����ֹͣ״̬����Ļˢ��

// ��ť��������
unsigned long lastDebounceTime = 0;
unsigned long debounceDelay = 50; // 50ms ����
int lastButtonState = HIGH;      // �ϴ�״̬����ʼΪ��
int currentButtonState = HIGH;   // ��ǰ�ȶ�״̬

DHT dht(DHT_PIN, DHT_TYPE);  
WebSocketsClient webSocket;  

// ��ȡ����ǿ�ȣ�����0-100�İٷֱȣ�
int readLightLevel() {
    int rawValue = analogRead(LIGHT_PIN);
    int lightLevel = map(rawValue, LIGHT_MIN, LIGHT_MAX, 0, 100);
    lightLevel = constrain(lightLevel, 0, 100);
    return lightLevel;
}

// ���Ʒ�����
void controlBuzzer(float temperature) {
    if (isRunning && !isnan(temperature) && temperature > TEMP_THRESHOLD) {
        digitalWrite(BUZZER_PIN, HIGH);
    } else {
        digitalWrite(BUZZER_PIN, LOW);
    }
}

// WebSocket�¼�������
void webSocketEvent(WStype_t type, uint8_t * payload, size_t length) {
    switch(type) {
        case WStype_DISCONNECTED:
            Serial.printf("[WebSocket] �¼�: �Ͽ�����!\n");
            wsConnected = false;
            break;
        case WStype_CONNECTED:
            Serial.printf("[WebSocket] �¼�: ���ӳɹ���URL: %s\n", payload);
            wsConnected = true;
            break;
        case WStype_TEXT:
            Serial.printf("[WebSocket] �¼�: �յ��ı�: %s\n", payload);
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
            //Serial.println("[WebSocket] �¼�: �յ� PING");
            break;
        case WStype_PONG:
            //Serial.println("[WebSocket] �¼�: �յ� PONG");
            break;
    }
}

// ������������WebSocket
void tryReconnectWebSocket() {
    if (isRunning && WiFi.status() == WL_CONNECTED && !wsConnected && (millis() - lastReconnectAttempt > reconnectInterval)) {
        Serial.println("[WebSocket] �����ⲿ����...");
        webSocket.begin(wsHost, wsPort, wsPath);
        lastReconnectAttempt = millis();
    }
}

// ����OLED��ʾ
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
    Serial.begin(115200);  // �ϸ߲������Ի�ø��õĵ������
    while (!Serial); // �ȴ��������� (��ѡ)
    Serial.println("\n[System] ��ʼ��...");  

    // ��ʼ��I2C
    Wire.begin(SDA_PIN, SCL_PIN);
    
    // ��ʼ��OLED��ʾ��
    if(!display.begin(SSD1306_SWITCHCAPVCC, SCREEN_ADDRESS)) {
        Serial.println(F("[Error] SSD1306 ��ʼ��ʧ��"));
        for(;;);
    }
    
    // ������ʾ���ĶԱȶȣ���ѡ��
    display.ssd1306_command(SSD1306_SETCONTRAST);
    display.ssd1306_command(128); // ���öԱȶ�Ϊ�е�����
    
    display.clearDisplay();
    display.setTextSize(1);
    display.setTextColor(SSD1306_WHITE);
    display.setCursor(0,0);
    display.println("Initializing...");
    display.display();
    delay(1000);  // ����������ʾʱ��

    // ��ʼ��������
    dht.begin();
    pinMode(LIGHT_PIN, INPUT);
    pinMode(BUZZER_PIN, OUTPUT);
    digitalWrite(BUZZER_PIN, LOW);
    pinMode(BUTTON_PIN, INPUT_PULLUP); // ��ʼ����ť

    // ���ӵ�WiFi  
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
        Serial.println("[NTP] ʱ��ͬ����...");
        
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
        while(1) delay(1000); // ��ʱֹͣ����
    }
    
    // ����WebSocket
    webSocket.onEvent(webSocketEvent);

    webSocket.enableHeartbeat(15000, 5000, 2);

    webSocket.setReconnectInterval(5000);

    Serial.println("[System] ��ʼ�����. �ȴ���������...");
    // ȷ����ʼ��Ļ��ֹͣ״̬
    updateDisplay(NAN, NAN, -1, false, isRunning); // ��ʾ��ʼֹͣ����
}  

void loop() {  
    unsigned long currentMillis = millis();
    
    // ��ť�����߼�
    int reading = digitalRead(BUTTON_PIN);
    if (reading != lastButtonState) {
        lastDebounceTime = currentMillis;
    }
    if ((currentMillis - lastDebounceTime) > debounceDelay) {
        if (reading != currentButtonState) {
            currentButtonState = reading;
            if (currentButtonState == LOW) { // ��⵽�ȶ�����״̬
                isRunning = !isRunning; // �л�״̬
                Serial.printf("[Control] ��ť���£�״̬�л�Ϊ: %s\n", isRunning ? "�����" : "��ֹͣ");

                if (isRunning) {
                    // �л�������
                    Serial.println("[System] ��ʼ���...");
                    // ��������WebSocket (���WiFi������)
                    if (WiFi.status() == WL_CONNECTED) {
                         Serial.println("[WebSocket] �״γ�ʼ����...");
                         webSocket.begin(wsHost, wsPort, wsPath); // �״����ӳ��Գ�ʼ
                         lastReconnectAttempt = currentMillis;
                    } else {
                         Serial.println("[Warn] WiFi δ���ӣ��޷����� WebSocket");
                         // isRunning ��ȻΪ true, �ȴ� WiFi �ָ�
                    }
                } else {
                    // �л���ֹͣ
                    Serial.println("[System] ֹͣ���...");
                    if (wsConnected) {
                        webSocket.disconnect(); // �ֶ��Ͽ�
                        Serial.println("[WebSocket] ���ֶ��Ͽ�");
                    }
                    digitalWrite(BUZZER_PIN, LOW); // �رշ�����
                    wsConnected = false; // ȷ��״̬ͬ��
                }
                 // ״̬�л���ʱ������ʾ
                updateDisplay(NAN, NAN, -1, false, isRunning);
                lastDisplayUpdateTime = currentMillis;
            }
        }
    }
    lastButtonState = reading; // �����ϴζ�ȡ��״̬

    if (isRunning) {
        // �����ڲ� webSocket.loop()
        webSocket.loop();

        if (WiFi.status() != WL_CONNECTED) {
            Serial.println("[WiFi] Warn: ���Ӷ�ʧ! �ȴ��Զ�������WebSocket������...");
            wifiReconnectDisplayUntil = currentMillis + 2000;
            // WiFi�Ͽ���WebSocket��Ȼ�Ͽ����رտ��ܵľ���
            if(wsConnected) { // ��� wsConnected ��û�б��ص��¼���false
                 wsConnected = false; // �ֶ���false��������۷���
                 Serial.println("[System] WiFi��ʧ�����WebSocketΪ�Ͽ�");
            }
            digitalWrite(BUZZER_PIN, LOW);
        }

        if (WiFi.status() == WL_CONNECTED) {
            tryReconnectWebSocket(); // ����ڲ���� isRunning �� wsConnected
        }

        if (wsConnected && (currentMillis - lastDataSendTime >= dataSendInterval)) {
            float temperature = dht.readTemperature();  
            float humidity = dht.readHumidity();  
            int lightLevel = readLightLevel();

            bool sensorOk = true;
            if (isnan(temperature) || isnan(humidity)) {  
                Serial.println("[Error] �޷���ȡ��ʪ�ȴ�����!");  
                sensorErrorDisplayUntil = currentMillis + 2000;
                sensorOk = false;
            }  

            controlBuzzer(temperature);

            updateDisplay(temperature, humidity, lightLevel,
                          sensorOk && (temperature > TEMP_THRESHOLD), isRunning);
            lastDisplayUpdateTime = currentMillis; // ������ʾʱ���

            if (sensorOk && wsConnected) {
                StaticJsonDocument<200> doc;
                doc["temperature"] = temperature;
                doc["humidity"] = humidity;
                doc["light"] = lightLevel;
                doc["alarm"] = (temperature > TEMP_THRESHOLD);
                
                // ���ʵ��ʱ���
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
                    //Serial.println("[Data] ����: " + jsonString);
                } else {
                    Serial.println("[Error] WebSocket ����ʧ�ܻ��ѶϿ�!");
                }
            }
            lastDataSendTime = currentMillis;
        }
        // �����ʱ��û�з������ݣ���WSδ���ӣ���Ӧˢ��һ����Ļ
        else if (currentMillis - lastDisplayUpdateTime > 1000) {
             float temp_dummy = dht.readTemperature(true); // ���Զ�ȡ������ʾ
             int light_dummy = readLightLevel();
             updateDisplay(temp_dummy, NAN, light_dummy, false, isRunning);
             lastDisplayUpdateTime = currentMillis;
        }
    } else {
        // ֹͣ״̬�߼�
        digitalWrite(BUZZER_PIN, LOW); // ȷ���������ر�

        // �����Ը���ֹͣ����
        if (currentMillis - lastDisplayUpdateTime > 1000) {
             updateDisplay(NAN, NAN, -1, false, isRunning);
             lastDisplayUpdateTime = currentMillis;
        }
    }

    delay(10);
} 