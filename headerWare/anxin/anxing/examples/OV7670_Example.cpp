#include <Arduino.h>
#include <WiFi.h>
#include <WebSocketsServer.h>
#include <ESP32_OV7670.h> // 这是专用库的头文件

// WiFi配置
const char *ssid = "PPX";
const char *password = "a1668692058";

// 相机引脚定义 - 请根据你的接线调整
// SCL: GPIO22
// SDA: GPIO21
// VSYNC: 34
// HREF: 35
// PCLK: 32
// XCLK: 33
// D0-D7: 13, 12, 14, 27, 26, 25, 33, 32 (如果需要调整，请修改ESP32_OV7670库中的定义)

// 创建OV7670相机对象
ESP32_OV7670 camera;

// 创建WebSocket服务器
WebSocketsServer webSocket = WebSocketsServer(8380);

// WebSocket事件处理
void webSocketEvent(uint8_t num, WStype_t type, uint8_t *payload, size_t length)
{
    switch (type)
    {
    case WStype_DISCONNECTED:
        Serial.printf("[WebSocket] #%u 断开连接\n", num);
        break;
    case WStype_CONNECTED:
    {
        IPAddress ip = webSocket.remoteIP(num);
        Serial.printf("[WebSocket] #%u 连接来自 %d.%d.%d.%d\n", num, ip[0], ip[1], ip[2], ip[3]);
    }
    break;
    case WStype_TEXT:
        Serial.printf("[WebSocket] #%u 收到文本: %s\n", payload);
        // 接收到"capture"命令时拍照
        if (strcmp((char *)payload, "capture") == 0)
        {
            captureAndSendPhoto(num);
        }
        break;
    }
}

// 捕获并发送照片
void captureAndSendPhoto(uint8_t clientNum)
{
    Serial.println("[Camera] 开始捕获OV7670照片...");

    // 使用OV7670专用库捕获照片
    uint8_t *fb = camera.capture();
    if (!fb)
    {
        Serial.println("[Error] 照片捕获失败");
        return;
    }

    // 获取图像信息
    int width = camera.getWidth();
    int height = camera.getHeight();
    int size = camera.getSize();
    int format = camera.getFormat();

    Serial.printf("[Camera] 照片捕获成功: %dx%d, 大小: %d字节\n", width, height, size);

    // 使用Base64编码并发送
    String base64Image = base64_encode(fb, size);
    String header = "{\"type\":\"camera\",\"format\":\"" + String(format) +
                    "\",\"width\":" + String(width) +
                    ",\"height\":" + String(height) +
                    ",\"camera_type\":\"OV7670\",\"imageData\":\"data:image/raw;base64,";
    String footer = "\"}";

    // 分段发送大图像
    int packetSize = 4000; // WebSocket最大消息长度限制
    int packets = (base64Image.length() + packetSize - 1) / packetSize;

    // 发送头部
    webSocket.sendTXT(clientNum, header);

    // 分段发送图像数据
    for (int i = 0; i < packets; i++)
    {
        int start = i * packetSize;
        int end = min((i + 1) * packetSize, (int)base64Image.length());
        webSocket.sendTXT(clientNum, base64Image.substring(start, end));
    }

    // 发送尾部
    webSocket.sendTXT(clientNum, footer);

    // 释放缓冲区
    camera.releaseFrame();

    Serial.println("[Camera] OV7670照片发送成功");
}

void setup()
{
    Serial.begin(115200);
    Serial.println("\n[System] 初始化...");

    // 连接WiFi
    WiFi.begin(ssid, password);
    while (WiFi.status() != WL_CONNECTED)
    {
        delay(500);
        Serial.print(".");
    }
    Serial.println("");
    Serial.print("[WiFi] 连接成功，IP地址: ");
    Serial.println(WiFi.localIP());

    // 初始化OV7670相机
    if (camera.init())
    {
        Serial.println("[Camera] OV7670初始化成功!");
    }
    else
    {
        Serial.println("[Error] OV7670初始化失败!");
        // 尝试不同的配置
        camera.setResolution(QVGA); // 尝试更小的分辨率
        if (camera.init())
        {
            Serial.println("[Camera] OV7670初始化成功 (降低分辨率)!");
        }
        else
        {
            Serial.println("[Error] OV7670初始化失败，程序将继续运行其他功能");
        }
    }

    // 启动WebSocket服务器
    webSocket.begin();
    webSocket.onEvent(webSocketEvent);
    Serial.println("[WebSocket] 服务器已启动");
}

void loop()
{
    webSocket.loop();

    // 添加其他代码...
    delay(10);
}

// Base64编码函数 (如果ESP32_OV7670库没有提供)
String base64_encode(const uint8_t *data, size_t length)
{
    const char base64_chars[] =
        "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
        "abcdefghijklmnopqrstuvwxyz"
        "0123456789+/";

    String encoded;
    encoded.reserve(((length + 2) / 3) * 4);

    size_t i = 0;
    while (i < length)
    {
        uint32_t octet_a = i < length ? data[i++] : 0;
        uint32_t octet_b = i < length ? data[i++] : 0;
        uint32_t octet_c = i < length ? data[i++] : 0;

        uint32_t triple = (octet_a << 0x10) + (octet_b << 0x08) + octet_c;

        encoded += base64_chars[(triple >> 3 * 6) & 0x3F];
        encoded += base64_chars[(triple >> 2 * 6) & 0x3F];
        encoded += base64_chars[(triple >> 1 * 6) & 0x3F];
        encoded += base64_chars[(triple >> 0 * 6) & 0x3F];
    }

    // 根据输入长度添加适当的填充
    switch (length % 3)
    {
    case 1:
        encoded[encoded.length() - 1] = '=';
        encoded[encoded.length() - 2] = '=';
        break;
    case 2:
        encoded[encoded.length() - 1] = '=';
        break;
    }

    return encoded;
}