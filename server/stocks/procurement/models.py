from django.db import models
from django.conf import settings
from inventory.models import Ingredient

class Supplier(models.Model):
    """供应商模型"""
    name = models.CharField("名称", max_length=100)
    contact_person = models.CharField("联系人", max_length=100)
    phone = models.CharField("电话", max_length=20)
    email = models.EmailField("邮箱", blank=True, null=True)
    address = models.TextField("地址", blank=True, null=True)
    products = models.TextField("供应产品", blank=True, null=True)
    rating = models.FloatField("评分", default=0, blank=True, null=True)
    notes = models.TextField("备注", blank=True, null=True)
    is_active = models.BooleanField("是否活跃", default=True)
    created_at = models.DateTimeField("创建时间", auto_now_add=True)
    updated_at = models.DateTimeField("更新时间", auto_now=True)

    def __str__(self):
        return self.name

    class Meta:
        verbose_name = "供应商"
        verbose_name_plural = "供应商"


class ProcurementPlan(models.Model):
    """采购计划模型"""
    STATUS_CHOICES = (
        ('draft', '草稿'),
        ('pending', '待审批'),
        ('approved', '已批准'),
        ('completed', '已完成'),
        ('rejected', '已拒绝'),
    )

    title = models.CharField("标题", max_length=100)
    description = models.TextField("描述")
    start_date = models.DateField("开始日期")
    end_date = models.DateField("结束日期")
    status = models.CharField("状态", max_length=20, choices=STATUS_CHOICES, default='draft')
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        verbose_name="创建人",
        on_delete=models.CASCADE, 
        related_name="created_procurement_plans"
    )
    approved_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        verbose_name="审批人",
        on_delete=models.SET_NULL, 
        related_name="approved_procurement_plans", 
        null=True, 
        blank=True
    )
    approved_at = models.DateTimeField("审批时间", null=True, blank=True)
    reject_reason = models.TextField("拒绝原因", blank=True, null=True)
    created_at = models.DateTimeField("创建时间", auto_now_add=True)
    updated_at = models.DateTimeField("更新时间", auto_now=True)
    
    @property
    def total_budget(self):
        """计算总预算"""
        return sum(item.total_price for item in self.items.all())
    
    @property
    def total_items(self):
        """计算物料总数"""
        return self.items.count()
    
    @property
    def status_display(self):
        """获取状态显示值"""
        return dict(self.STATUS_CHOICES).get(self.status, "未知")
    
    def __str__(self):
        return self.title
    
    class Meta:
        verbose_name = "采购计划"
        verbose_name_plural = "采购计划"


class ProcurementItem(models.Model):
    """采购项目模型"""
    STATUS_CHOICES = (
        ('pending', '待处理'),
        ('ordered', '已订购'),
        ('received', '已收货'),
        ('cancelled', '已取消'),
    )
    
    plan = models.ForeignKey(
        ProcurementPlan, 
        verbose_name="所属计划",
        on_delete=models.CASCADE, 
        related_name="items"
    )
    ingredient = models.ForeignKey(
        Ingredient, 
        verbose_name="原料",
        on_delete=models.CASCADE, 
        related_name="procurement_items"
    )
    quantity = models.DecimalField("数量", max_digits=10, decimal_places=2)
    unit_price = models.DecimalField("单价", max_digits=10, decimal_places=2)
    supplier = models.ForeignKey(
        Supplier, 
        verbose_name="供应商",
        on_delete=models.SET_NULL, 
        related_name="procurement_items", 
        null=True, 
        blank=True
    )
    status = models.CharField("状态", max_length=20, choices=STATUS_CHOICES, default='pending')
    notes = models.TextField("备注", blank=True, null=True)
    expected_delivery_date = models.DateField("预计送达日期", null=True, blank=True)
    actual_delivery_date = models.DateField("实际送达日期", null=True, blank=True)
    created_at = models.DateTimeField("创建时间", auto_now_add=True)
    updated_at = models.DateTimeField("更新时间", auto_now=True)
    
    @property
    def total_price(self):
        """计算总价"""
        return self.quantity * self.unit_price
    
    @property
    def status_display(self):
        """获取状态显示值"""
        return dict(self.STATUS_CHOICES).get(self.status, "未知")
    
    @property
    def ingredient_name(self):
        """获取原料名称"""
        return self.ingredient.name if self.ingredient else None
    
    @property
    def unit(self):
        """获取单位"""
        return self.ingredient.unit if self.ingredient else None
    
    def __str__(self):
        return f"{self.ingredient.name if self.ingredient else '未指定原料'} - {self.quantity}"
    
    class Meta:
        verbose_name = "采购项目"
        verbose_name_plural = "采购项目"


class MaterialSupervision(models.Model):
    """物料监督单模型"""
    STATUS_CHOICES = (
        ('pending', '待处理'),
        ('processing', '处理中'),
        ('completed', '已完成'),
        ('cancelled', '已取消'),
    )
    
    PRIORITY_CHOICES = (
        ('low', '低'),
        ('medium', '中'),
        ('high', '高'),
    )
    
    title = models.CharField("标题", max_length=100)
    description = models.TextField("描述", blank=True, null=True)
    ingredients = models.ManyToManyField(
        Ingredient, 
        verbose_name="相关原料",
        related_name="supervisions"
    )
    quantity_required = models.JSONField("所需数量", default=dict)  # 存储原料ID和对应数量的字典
    status = models.CharField("状态", max_length=20, choices=STATUS_CHOICES, default='pending')
    priority = models.CharField("优先级", max_length=20, choices=PRIORITY_CHOICES, default='medium')
    supervisor = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        verbose_name="监督人",
        on_delete=models.SET_NULL, 
        related_name="supervised_materials", 
        null=True, 
        blank=True
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        verbose_name="创建人",
        on_delete=models.CASCADE, 
        related_name="created_material_supervisions"
    )
    due_date = models.DateField("截止日期", null=True, blank=True)
    notes = models.TextField("备注", blank=True, null=True)
    created_at = models.DateTimeField("创建时间", auto_now_add=True)
    updated_at = models.DateTimeField("更新时间", auto_now=True)
    completed_at = models.DateTimeField("完成时间", null=True, blank=True)
    
    @property
    def status_display(self):
        """获取状态显示值"""
        return dict(self.STATUS_CHOICES).get(self.status, "未知")
    
    @property
    def priority_display(self):
        """获取优先级显示值"""
        return dict(self.PRIORITY_CHOICES).get(self.priority, "未知")
    
    def __str__(self):
        return self.title
    
    class Meta:
        verbose_name = "物料监督单"
        verbose_name_plural = "物料监督单"
