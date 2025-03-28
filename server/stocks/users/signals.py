from django.db.models.signals import post_save, m2m_changed
from django.dispatch import receiver
from django.contrib.auth import get_user_model
from .models import Role, UserRole

User = get_user_model()


@receiver(post_save, sender=User)
def create_user_profile(sender, instance, created, **kwargs):
    """
    当创建新用户时，可以在这里进行一些初始化操作
    如自动分配默认角色等
    """
    if created:
        # 例如，可以在这里为新用户分配默认角色
        try:
            default_role = Role.objects.get(name='普通用户')
            UserRole.objects.create(user=instance, role=default_role)
        except Role.DoesNotExist:
            # 如果默认角色不存在，可以在这里创建
            pass


@receiver(m2m_changed, sender=Role.permissions.through)
def role_permissions_changed(sender, instance, action, **kwargs):
    """
    当角色的权限发生变化时，可以在这里进行处理
    """
    if action in ['post_add', 'post_remove', 'post_clear']:
        # 可以在这里触发缓存刷新等操作
        pass 