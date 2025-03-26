from django.contrib import admin
from .models import STM32Data

@admin.register(STM32Data)
class STM32DataAdmin(admin.ModelAdmin):
    list_display = ('topic', 'payload', 'qos', 'timestamp')
    list_filter = ('topic', 'timestamp')
    search_fields = ('topic', 'payload')
    readonly_fields = ('timestamp',)
