from django.db import models
from django.contrib.auth.models import AbstractUser, Permission
from django.utils.translation import gettext_lazy as _


class User(AbstractUser):
    """
    自定义用户模型，扩展Django内置的用户模型
    """
    phone = models.CharField(_('手机号'), max_length=11, blank=True, null=True)
    avatar = models.CharField(_('头像'), max_length=255, blank=True, null=True)
    
    class Meta:
        verbose_name = _('用户')
        verbose_name_plural = _('用户')
        
    def __str__(self):
        return self.username


class Role(models.Model):
    """
    角色模型，用于RBAC权限管理
    """
    name = models.CharField(_('角色名称'), max_length=50, unique=True)
    description = models.TextField(_('角色描述'), blank=True, null=True)
    permissions = models.ManyToManyField(
        Permission,
        verbose_name=_('权限'),
        blank=True,
    )
    created_at = models.DateTimeField(_('创建时间'), auto_now_add=True)
    updated_at = models.DateTimeField(_('更新时间'), auto_now=True)
    
    class Meta:
        verbose_name = _('角色')
        verbose_name_plural = _('角色')
        
    def __str__(self):
        return self.name


class UserRole(models.Model):
    """
    用户角色关联模型
    """
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        verbose_name=_('用户'),
        related_name='user_roles'
    )
    role = models.ForeignKey(
        Role,
        on_delete=models.CASCADE,
        verbose_name=_('角色'),
        related_name='role_users'
    )
    created_at = models.DateTimeField(_('创建时间'), auto_now_add=True)
    
    class Meta:
        verbose_name = _('用户角色')
        verbose_name_plural = _('用户角色')
        unique_together = ('user', 'role')
        
    def __str__(self):
        return f"{self.user.username} - {self.role.name}"
