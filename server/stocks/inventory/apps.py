from django.apps import AppConfig


class InventoryConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'inventory'
    verbose_name = '库存管理'

    def ready(self):
        import inventory.signals  # 导入信号模块
