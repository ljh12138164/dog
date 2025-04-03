from django.db import models
from django.contrib.auth.models import AbstractUser, Permission
from django.utils.translation import gettext_lazy as _


class User(AbstractUser):
    """
    自定义用户模型，扩展Django内置的用户模型
    """
    phone = models.CharField(_('手机号'), max_length=11, blank=True, null=True)
    avatar = models.ImageField(_('头像'), upload_to='avatars/', blank=True, null=True)
    # 添加字段标识用户类型
    USER_TYPES = (
        ('admin', '系统管理员'),
        ('inventory', '库存管理员'),
        ('procurement', '采购经理'),
        ('logistics', '物流管理员'),
        ('employee', '普通员工'),
    )
    user_type = models.CharField(_('用户类型'), max_length=20, choices=USER_TYPES, default='employee')
    
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


class LoginLog(models.Model):
    """
    登录日志模型，记录用户登录信息
    """
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        verbose_name=_('用户'),
        related_name='login_logs'
    )
    ip_address = models.GenericIPAddressField(_('IP地址'), blank=True, null=True)
    user_agent = models.TextField(_('用户代理'), blank=True, null=True)
    login_time = models.DateTimeField(_('登录时间'), auto_now_add=True)
    is_success = models.BooleanField(_('是否成功'), default=True)
    
    class Meta:
        verbose_name = _('登录日志')
        verbose_name_plural = _('登录日志')
        ordering = ['-login_time']
        
    def __str__(self):
        status = "成功" if self.is_success else "失败"
        return f"{self.user.username} - {self.login_time} - {status}"


class SystemConfig(models.Model):
    """
    系统配置模型，存储系统全局参数
    """
    key = models.CharField(_('配置键'), max_length=100, unique=True)
    value = models.TextField(_('配置值'))
    description = models.TextField(_('配置描述'), blank=True, null=True)
    created_at = models.DateTimeField(_('创建时间'), auto_now_add=True)
    updated_at = models.DateTimeField(_('更新时间'), auto_now=True)
    updated_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        verbose_name=_('更新者'),
        related_name='updated_configs',
        blank=True,
        null=True
    )
    
    class Meta:
        verbose_name = _('系统配置')
        verbose_name_plural = _('系统配置')
        
    def __str__(self):
        return f"{self.key}: {self.value}"
