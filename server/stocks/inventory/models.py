from django.db import models
from django.utils.translation import gettext_lazy as _
from users.models import User


class Ingredient(models.Model):
    """
    食材模型，记录仓库中的食材信息
    """
    name = models.CharField(_('食材名称'), max_length=100)
    category = models.CharField(_('分类'), max_length=50)
    unit = models.CharField(_('单位'), max_length=20)
    quantity = models.FloatField(_('数量'), default=0)
    expiry_date = models.DateField(_('过期日期'))
    STATUS_CHOICES = (
        ('normal', '正常'),
        ('expired', '已过期'),
        ('low', '库存不足'),
        ('pending_check', '待检查'),
    )
    status = models.CharField(_('状态'), max_length=20, choices=STATUS_CHOICES, default='normal')
    location = models.CharField(_('存放位置'), max_length=100)
    last_check_date = models.DateField(_('最后检查日期'), null=True, blank=True)
    created_at = models.DateTimeField(_('创建时间'), auto_now_add=True)
    updated_at = models.DateTimeField(_('更新时间'), auto_now=True)

    class Meta:
        verbose_name = _('食材')
        verbose_name_plural = _('食材')
        ordering = ['category', 'name']

    def __str__(self):
        return f"{self.name} ({self.quantity} {self.unit})"


class InventoryOperation(models.Model):
    """
    库存操作记录，记录食材的出入库操作
    """
    ingredient = models.ForeignKey(
        Ingredient,
        on_delete=models.CASCADE,
        verbose_name=_('食材'),
        related_name='operations'
    )
    OPERATION_TYPES = (
        ('in', '入库'),
        ('out', '出库'),
    )
    operation_type = models.CharField(_('操作类型'), max_length=10, choices=OPERATION_TYPES)
    quantity = models.FloatField(_('数量'))
    operator = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        verbose_name=_('操作员'),
        related_name='inventory_operations'
    )
    notes = models.TextField(_('备注'), blank=True, null=True)
    created_at = models.DateTimeField(_('操作时间'), auto_now_add=True)

    class Meta:
        verbose_name = _('库存操作')
        verbose_name_plural = _('库存操作')
        ordering = ['-created_at']

    def __str__(self):
        op_type = '入库' if self.operation_type == 'in' else '出库'
        return f"{op_type}: {self.ingredient.name} {self.quantity} {self.ingredient.unit}"

    def save(self, *args, **kwargs):
        # 更新食材库存数量
        if self.operation_type == 'in':
            self.ingredient.quantity += self.quantity
        else:  # 出库
            self.ingredient.quantity -= self.quantity
        
        # 检查库存状态
        if self.ingredient.quantity <= 0:
            self.ingredient.status = 'low'
        
        self.ingredient.save()
        super().save(*args, **kwargs)


class Task(models.Model):
    """
    员工任务模型
    """
    title = models.CharField(_('任务标题'), max_length=200)
    description = models.TextField(_('任务描述'))
    STATUS_CHOICES = (
        ('pending', '待处理'),
        ('completed', '已完成'),
    )
    status = models.CharField(_('状态'), max_length=20, choices=STATUS_CHOICES, default='pending')
    due_date = models.DateField(_('截止日期'))
    PRIORITY_CHOICES = (
        ('low', '低'),
        ('medium', '中'),
        ('high', '高'),
    )
    priority = models.CharField(_('优先级'), max_length=10, choices=PRIORITY_CHOICES, default='medium')
    assigned_to = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        verbose_name=_('指派给'),
        related_name='assigned_tasks'
    )
    created_by = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        verbose_name=_('创建者'),
        related_name='created_tasks'
    )
    created_at = models.DateTimeField(_('创建时间'), auto_now_add=True)
    updated_at = models.DateTimeField(_('更新时间'), auto_now=True)
    completed_at = models.DateTimeField(_('完成时间'), null=True, blank=True)

    class Meta:
        verbose_name = _('任务')
        verbose_name_plural = _('任务')
        ordering = ['-priority', 'due_date']

    def __str__(self):
        return f"{self.title} - {self.get_status_display()}"


class Feedback(models.Model):
    """
    员工反馈模型，用于提交异常情况反馈
    """
    title = models.CharField(_('标题'), max_length=200)
    description = models.TextField(_('详细描述'))
    STATUS_CHOICES = (
        ('pending', '待处理'),
        ('processing', '处理中'),
        ('resolved', '已解决'),
    )
    status = models.CharField(_('状态'), max_length=20, choices=STATUS_CHOICES, default='pending')
    reporter = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        verbose_name=_('报告人'),
        related_name='reported_feedbacks'
    )
    handler = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        verbose_name=_('处理人'),
        related_name='handled_feedbacks',
        null=True,
        blank=True
    )
    resolution_notes = models.TextField(_('解决方案说明'), blank=True, null=True)
    created_at = models.DateTimeField(_('创建时间'), auto_now_add=True)
    updated_at = models.DateTimeField(_('更新时间'), auto_now=True)
    resolved_at = models.DateTimeField(_('解决时间'), null=True, blank=True)
    
    class Meta:
        verbose_name = _('异常反馈')
        verbose_name_plural = _('异常反馈')
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.title} - {self.get_status_display()}"


class Comment(models.Model):
    """
    评论模型，用于反馈评论
    """
    feedback = models.ForeignKey(
        Feedback,
        on_delete=models.CASCADE,
        verbose_name=_('反馈'),
        related_name='comments'
    )
    content = models.TextField(_('评论内容'))
    created_by = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        verbose_name=_('评论人'),
        related_name='comments'
    )
    created_at = models.DateTimeField(_('创建时间'), auto_now_add=True)

    class Meta:
        verbose_name = _('评论')
        verbose_name_plural = _('评论')
        ordering = ['created_at']

    def __str__(self):
        return f"评论 by {self.created_by.username} on {self.feedback.title}"


class EnvironmentData(models.Model):
    """
    环境数据模型，记录库存环境的温度和湿度
    """
    temperature = models.FloatField(_('温度'), help_text='单位：摄氏度')
    humidity = models.FloatField(_('湿度'), help_text='单位：%')
    recorded_at = models.DateTimeField(_('记录时间'), auto_now_add=True)
    notes = models.TextField(_('备注'), blank=True, null=True)

    class Meta:
        verbose_name = _('环境数据')
        verbose_name_plural = _('环境数据')
        ordering = ['-recorded_at']

    def __str__(self):
        return f"温度: {self.temperature}°C, 湿度: {self.humidity}% ({self.recorded_at.strftime('%Y-%m-%d %H:%M')})"


class InventoryEvent(models.Model):
    """
    库存事件模型，记录库存异常情况和处理
    """
    EVENT_TYPES = (
        ('shortage', '库存短缺'),
        ('excess', '库存过剩'),
        ('expiry', '临近过期'),
        ('damaged', '物品损坏'),
        ('miscount', '盘点差异'),
        ('special_request', '特殊出库请求'),
        ('other', '其他'),
    )
    event_type = models.CharField(_('事件类型'), max_length=20, choices=EVENT_TYPES)
    title = models.CharField(_('事件标题'), max_length=100)
    description = models.TextField(_('事件描述'))
    ingredients = models.ManyToManyField(
        Ingredient,
        verbose_name=_('相关食材'),
        related_name='events',
        blank=True
    )
    STATUS_CHOICES = (
        ('pending', '待处理'),
        ('processing', '处理中'),
        ('resolved', '已解决'),
        ('rejected', '已拒绝'),
    )
    status = models.CharField(_('状态'), max_length=20, choices=STATUS_CHOICES, default='pending')
    reported_by = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        verbose_name=_('报告人'),
        related_name='reported_events'
    )
    handled_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        verbose_name=_('处理人'),
        related_name='handled_events',
        null=True,
        blank=True
    )
    resolution_notes = models.TextField(_('解决方案'), blank=True, null=True)
    created_at = models.DateTimeField(_('创建时间'), auto_now_add=True)
    updated_at = models.DateTimeField(_('更新时间'), auto_now=True)
    resolved_at = models.DateTimeField(_('解决时间'), null=True, blank=True)

    class Meta:
        verbose_name = _('库存事件')
        verbose_name_plural = _('库存事件')
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.get_event_type_display()}: {self.title} ({self.get_status_display()})"


class InventoryReport(models.Model):
    """
    库存报告模型，用于生成周期性库存报告
    """
    REPORT_TYPES = (
        ('daily', '日报'),
        ('weekly', '周报'),
        ('monthly', '月报'),
        ('custom', '自定义'),
    )
    report_type = models.CharField(_('报告类型'), max_length=20, choices=REPORT_TYPES)
    title = models.CharField(_('报告标题'), max_length=100)
    start_date = models.DateField(_('开始日期'))
    end_date = models.DateField(_('结束日期'))
    summary = models.TextField(_('摘要'))
    details = models.TextField(_('详细内容'))
    created_by = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        verbose_name=_('创建人'),
        related_name='created_reports'
    )
    created_at = models.DateTimeField(_('创建时间'), auto_now_add=True)

    class Meta:
        verbose_name = _('库存报告')
        verbose_name_plural = _('库存报告')
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.get_report_type_display()}: {self.title} ({self.start_date} - {self.end_date})"


class SensorData(models.Model):
    """
    传感器数据模型，用于存储从WebSocket接收到的传感器数据
    """
    temperature = models.FloatField(_('温度'), help_text='单位：摄氏度', null=True, blank=True)
    humidity = models.FloatField(_('湿度'), help_text='单位：%')
    light = models.FloatField(_('光照'), help_text='单位：lux')
    timestamp = models.DateTimeField(_('时间戳'))
    created_at = models.DateTimeField(_('创建时间'), auto_now_add=True)

    class Meta:
        verbose_name = _('传感器数据')
        verbose_name_plural = _('传感器数据')
        ordering = ['-timestamp']

    def __str__(self):
        return f"湿度: {self.humidity}%, 光照: {self.light} lux ({self.timestamp.strftime('%Y-%m-%d %H:%M')})"
