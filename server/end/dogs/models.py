from django.db import models
from django.contrib.auth.models import User

class Dog(models.Model):
    owner = models.ForeignKey(User, on_delete=models.CASCADE, related_name='dogs')
    name = models.CharField(max_length=100, verbose_name='名字')
    breed = models.CharField(max_length=100, verbose_name='品种')
    height = models.FloatField(verbose_name='身高(cm)')
    weight = models.FloatField(verbose_name='体重(kg)')
    image = models.ImageField(upload_to='dogs/', null=True, blank=True, verbose_name='狗狗图片')
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='创建时间')
    updated_at = models.DateTimeField(auto_now=True, verbose_name='更新时间')

    class Meta:
        verbose_name = '狗狗'
        verbose_name_plural = '狗狗'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.owner.username}的{self.name}({self.breed})"
