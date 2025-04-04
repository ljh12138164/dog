# Generated by Django 5.0.2 on 2025-04-03 08:29

import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('inventory', '0001_initial'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='EnvironmentRecord',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('temperature', models.FloatField(verbose_name='温度(°C)')),
                ('humidity', models.FloatField(verbose_name='湿度(%)')),
                ('recorded_at', models.DateTimeField(auto_now_add=True, verbose_name='记录时间')),
                ('warehouse_section', models.CharField(default='main', max_length=50, verbose_name='仓库区域')),
            ],
            options={
                'verbose_name': '环境数据记录',
                'verbose_name_plural': '环境数据记录',
                'ordering': ['-recorded_at'],
            },
        ),
        migrations.CreateModel(
            name='InventoryAdjustment',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('previous_quantity', models.FloatField(verbose_name='调整前数量')),
                ('adjusted_quantity', models.FloatField(verbose_name='调整后数量')),
                ('adjustment_reason', models.TextField(verbose_name='调整原因')),
                ('created_at', models.DateTimeField(auto_now_add=True, verbose_name='调整时间')),
                ('adjusted_by', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='inventory_adjustments', to=settings.AUTH_USER_MODEL, verbose_name='调整人')),
                ('ingredient', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='adjustments', to='inventory.ingredient', verbose_name='食材')),
            ],
            options={
                'verbose_name': '库存调整',
                'verbose_name_plural': '库存调整',
                'ordering': ['-created_at'],
            },
        ),
        migrations.CreateModel(
            name='SpecialRequest',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('quantity', models.FloatField(verbose_name='请求数量')),
                ('reason', models.TextField(verbose_name='请求原因')),
                ('status', models.CharField(choices=[('pending', '待审批'), ('approved', '已批准'), ('rejected', '已拒绝')], default='pending', max_length=20, verbose_name='状态')),
                ('created_at', models.DateTimeField(auto_now_add=True, verbose_name='创建时间')),
                ('updated_at', models.DateTimeField(auto_now=True, verbose_name='更新时间')),
                ('processed_at', models.DateTimeField(blank=True, null=True, verbose_name='处理时间')),
                ('approved_by', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='approved_special_requests', to=settings.AUTH_USER_MODEL, verbose_name='审批人')),
                ('ingredient', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='special_requests', to='inventory.ingredient', verbose_name='食材')),
                ('requested_by', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='requested_special_requests', to=settings.AUTH_USER_MODEL, verbose_name='请求人')),
            ],
            options={
                'verbose_name': '特殊出库请求',
                'verbose_name_plural': '特殊出库请求',
                'ordering': ['-created_at'],
            },
        ),
    ]
