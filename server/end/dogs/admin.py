from django.contrib import admin
from .models import Dog

@admin.register(Dog)
class DogAdmin(admin.ModelAdmin):
    list_display = ('name', 'breed', 'owner', 'height', 'weight', 'created_at')
    list_filter = ('breed', 'created_at')
    search_fields = ('name', 'breed', 'owner__username')
    ordering = ('-created_at',)
