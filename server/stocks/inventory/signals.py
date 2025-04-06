from django.db.models.signals import pre_save, post_save
from django.dispatch import receiver
from django.utils import timezone

from .models import Ingredient

@receiver(pre_save, sender=Ingredient)
def update_ingredient_status(sender, instance, **kwargs):
    """在保存食材前自动更新其状态"""
    today = timezone.now().date()
    
    # 手动设置状态的情况，不执行自动更新
    if hasattr(instance, '_manually_set_status') and instance._manually_set_status:
        return
        
    # 过期状态判断 - 只在有过期日期时判断
    if instance.expiry_date and instance.expiry_date < today:
        instance.status = 'expired'
    
    # 库存不足判断 (这里假设低于5就是库存不足)
    elif instance.quantity < 5:
        instance.status = 'low'
    
    # 如果超过7天没有检查，标记为待检查  
    elif instance.last_check_date and (today - instance.last_check_date).days > 7:
        instance.status = 'pending_check'
    
    # 否则为正常
    else:
        instance.status = 'normal'
        
@receiver(post_save, sender=Ingredient)
def log_ingredient_update(sender, instance, created, **kwargs):
    """记录食材更新日志"""
    if created:
        print(f"[LOG] 新食材已添加: {instance.name}, 状态: {instance.status}")
    else:
        print(f"[LOG] 食材已更新: {instance.name}, 状态: {instance.status}, 数量: {instance.quantity}{instance.unit}") 