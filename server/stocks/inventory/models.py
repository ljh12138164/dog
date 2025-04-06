from django.db import models
from django.utils.translation import gettext_lazy as _
from users.models import User
from django.utils import timezone
import re


class Category(models.Model):
    """
    食材分类模型，用于管理食材分类
    """
    name = models.CharField(max_length=100, verbose_name="分类名称")
    description = models.TextField(blank=True, null=True, verbose_name="分类描述")
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="创建时间")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="更新时间")

    class Meta:
        verbose_name = "食材分类"
        verbose_name_plural = "食材分类"

    def __str__(self):
        return self.name


class Ingredient(models.Model):
    """
    食材模型，用于管理食材库存
    """
    name = models.CharField(_('名称'), max_length=100)
    category = models.CharField(_('类别'), max_length=50)
    unit = models.CharField(_('单位'), max_length=20)
    quantity = models.FloatField(_('数量'), default=0)
    expiry_date = models.DateField(_('过期日期'), null=True, blank=True)
    status = models.CharField(
        _('状态'),
        max_length=20,
        choices=[
            ('normal', _('正常')),
            ('expired', _('已过期')),
            ('low', _('库存不足')),
            ('pending_check', _('待检查')),
        ],
        default='normal'
    )
    location = models.CharField(_('存放位置'), max_length=100, null=True, blank=True)
    last_check_date = models.DateField(_('最后检查日期'), null=True, blank=True)
    created_at = models.DateTimeField(_('创建时间'), auto_now_add=True)
    updated_at = models.DateTimeField(_('更新时间'), auto_now=True)

    class Meta:
        verbose_name = _('食材')
        verbose_name_plural = _('食材')
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.name} ({self.quantity} {self.unit})"

    def save(self, *args, **kwargs):
        # 状态更新已移至signals.py中的pre_save信号处理函数
        # 这里仅调用父类的save方法
        super().save(*args, **kwargs)


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
    production_date = models.DateField(_('生产日期'), null=True, blank=True)
    expiry_period = models.CharField(_('保质期'), max_length=50, null=True, blank=True)
    operator = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        verbose_name=_('操作员'),
        related_name='inventory_operations',
        null=True,  # 允许为空
        blank=True  # 表单提交时可以为空
    )
    inspector = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        verbose_name=_('入库检收人员'),
        related_name='inspected_operations',
        null=True,
        blank=True,
        help_text=_('入库操作的检收人员')
    )
    notes = models.TextField(_('备注'), blank=True, null=True)
    source = models.CharField(_('操作来源'), max_length=50, blank=True, null=True, 
                            help_text=_('操作的来源，如"管理员界面"、"普通用户界面"、"系统自动"等'))
    device_info = models.CharField(_('设备信息'), max_length=255, blank=True, null=True,
                                help_text=_('进行操作的设备信息'))
    ip_address = models.CharField(_('IP地址'), max_length=50, blank=True, null=True,
                               help_text=_('操作时的IP地址'))
    related_request = models.ForeignKey(
        'MaterialRequest',
        on_delete=models.SET_NULL,
        verbose_name=_('关联出库申请'),
        related_name='inventory_operations',
        null=True,
        blank=True,
        help_text=_('如果此操作由出库申请触发，记录关联的申请ID')
    )
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
            # 检查库存是否足够出库
            if self.ingredient.quantity < self.quantity:
                raise ValueError(f"库存不足，当前库存: {self.ingredient.quantity}{self.ingredient.unit}，尝试出库: {self.quantity}{self.ingredient.unit}")
            self.ingredient.quantity -= self.quantity
        
        # 不再在这里设置状态，由signals.py中的信号处理负责
        # 保存食材更新
        self.ingredient.save()
        
        # 从备注中提取操作信息（如来源、设备信息等）
        if self.notes:
            # 提取来源
            source_match = re.search(r'来源:([^,，。]+)', self.notes)
            if source_match and not self.source:
                self.source = source_match.group(1).strip()
                
            # 提取设备信息
            device_match = re.search(r'设备:([^,，。]+)', self.notes)
            if device_match and not self.device_info:
                self.device_info = device_match.group(1).strip()
                
            # 提取IP地址
            ip_match = re.search(r'IP:([^,，。]+)', self.notes)
            if ip_match and not self.ip_address:
                self.ip_address = ip_match.group(1).strip()
                
        # 如果没有操作员，尝试获取一个默认用户
        if not self.operator:
            try:
                default_user = User.objects.filter(is_staff=True).first() or User.objects.first()
                if default_user:
                    self.operator = default_user
            except Exception:
                # 如果找不到默认用户，继续保存（因为operator字段已设为可选）
                pass
            
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
    TASK_TYPE_CHOICES = (
        ('check', '检查'),
        ('procurement', '采购'),
        ('inventory', '库存'),
        ('other', '其他'),
    )
    task_type = models.CharField(_('任务类型'), max_length=20, choices=TASK_TYPE_CHOICES, default='other')
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
    threshold = models.FloatField(_('温度警报阈值'), help_text='单位：摄氏度，超过此值将触发警报', null=True, blank=True)
    timestamp = models.DateTimeField(_('时间戳'))
    created_at = models.DateTimeField(_('创建时间'), auto_now_add=True)

    class Meta:
        verbose_name = _('传感器数据')
        verbose_name_plural = _('传感器数据')
        ordering = ['-timestamp']

    def __str__(self):
        return f"湿度: {self.humidity}%, 光照: {self.light} lux ({self.timestamp.strftime('%Y-%m-%d %H:%M')})"


class MaterialRequest(models.Model):
    """
    出库申请模型，用于管理食材的出库申请流程
    """
    title = models.CharField(_('标题'), max_length=200)
    description = models.TextField(_('描述'), blank=True, null=True)
    status = models.CharField(
        _('状态'),
        max_length=20,
        choices=[
            ('pending', _('待审批')),
            ('approved', _('已批准')),
            ('in_progress', _('处理中')),
            ('completed', _('已完成')),
            ('rejected', _('已拒绝')),
        ],
        default='pending'
    )
    requested_by = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        verbose_name=_('申请人'),
        related_name='material_requests'
    )
    requested_at = models.DateTimeField(_('申请时间'), auto_now_add=True)
    approved_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        verbose_name=_('审批人'),
        related_name='approved_material_requests',
        null=True,
        blank=True
    )
    approved_at = models.DateTimeField(_('审批时间'), null=True, blank=True)
    assigned_to = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        verbose_name=_('指派处理员工'),
        related_name='assigned_material_requests',
        null=True,
        blank=True
    )
    assigned_at = models.DateTimeField(_('指派时间'), null=True, blank=True)
    completed_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        verbose_name=_('完成人'),
        related_name='completed_material_requests',
        null=True,
        blank=True
    )
    completed_at = models.DateTimeField(_('完成时间'), null=True, blank=True)

    class Meta:
        verbose_name = _('出库申请')
        verbose_name_plural = _('出库申请')
        ordering = ['-requested_at']

    def __str__(self):
        return f"{self.title} - {self.get_status_display()}"
    
    def approve(self, user):
        """批准出库申请"""
        if self.status != 'pending':
            raise ValueError("只有待审批状态的申请才能被批准")
        self.status = 'approved'
        self.approved_by = user
        self.approved_at = timezone.now()
        self.save()
    
    def reject(self, user):
        """拒绝出库申请"""
        if self.status != 'pending':
            raise ValueError("只有待审批状态的申请才能被拒绝")
        self.status = 'rejected'
        self.approved_by = user
        self.approved_at = timezone.now()
        self.save()
    
    def start_processing(self):
        """开始处理出库申请"""
        print(f"MaterialRequest.start_processing()方法被调用，ID: {self.id}, 当前状态: {self.status}")
        if self.status != 'approved':
            error_msg = f"只有已批准状态的申请才能开始处理，当前状态: {self.status}"
            print(f"错误: {error_msg}")
            raise ValueError(error_msg)
            
        try:
            self.status = 'in_progress'
            self.save()
            print(f"成功: 申请ID {self.id} 状态已更新为'处理中'")
            return True
        except Exception as e:
            print(f"更新状态时出错: {str(e)}")
            raise
    
    def complete(self, user):
        """完成出库申请"""
        if self.status != 'in_progress':
            raise ValueError("只有处理中状态的申请才能被标记为完成")
        self.status = 'completed'
        self.completed_by = user
        self.completed_at = timezone.now()
        self.save()
        
        # 执行实际的出库操作
        for item in self.items.all():
            InventoryOperation.objects.create(
                ingredient=item.ingredient,
                operation_type='out',
                quantity=item.quantity,
                operator=user,
                notes=f"通过出库申请 #{self.id} 出库"
            )


class MaterialRequestItem(models.Model):
    """
    出库申请项目模型，记录每个出库申请中的食材项目
    """
    request = models.ForeignKey(
        MaterialRequest,
        on_delete=models.CASCADE,
        verbose_name=_('申请'),
        related_name='items'
    )
    ingredient = models.ForeignKey(
        Ingredient,
        on_delete=models.CASCADE,
        verbose_name=_('食材')
    )
    quantity = models.FloatField(_('数量'))
    notes = models.TextField(_('备注'), blank=True, null=True)

    class Meta:
        verbose_name = _('出库申请项目')
        verbose_name_plural = _('出库申请项目')

    def __str__(self):
        return f"{self.ingredient.name} {self.quantity} {self.ingredient.unit}"
