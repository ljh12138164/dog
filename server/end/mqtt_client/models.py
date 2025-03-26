from django.db import models

# Create your models here.

class STM32Data(models.Model):
    """存储从STM32接收的数据"""
    topic = models.CharField(max_length=255, verbose_name='主题')
    payload = models.TextField(verbose_name='数据内容')
    qos = models.IntegerField(default=0, verbose_name='服务质量')
    timestamp = models.DateTimeField(auto_now_add=True, verbose_name='接收时间')
    
    def __str__(self):
        return f"{self.topic} - {self.timestamp}"
    
    class Meta:
        verbose_name = 'STM32数据'
        verbose_name_plural = 'STM32数据'
        ordering = ['-timestamp']
