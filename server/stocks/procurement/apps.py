from django.apps import AppConfig


class ProcurementConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'procurement'
    verbose_name = '采购管理'

    def ready(self):
        try:
            import procurement.signals  # noqa
        except ImportError:
            pass
