from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import User, Role, UserRole


@admin.register(User)
class CustomUserAdmin(UserAdmin):
    list_display = ('username', 'email', 'phone', 'is_staff', 'is_active')
    search_fields = ('username', 'email', 'phone')
    fieldsets = UserAdmin.fieldsets + (
        ('扩展信息', {'fields': ('phone', 'avatar')}),
    )
    add_fieldsets = UserAdmin.add_fieldsets + (
        ('扩展信息', {'fields': ('phone', 'avatar')}),
    )


@admin.register(Role)
class RoleAdmin(admin.ModelAdmin):
    list_display = ('name', 'description', 'created_at', 'updated_at')
    search_fields = ('name', 'description')
    filter_horizontal = ('permissions',)


@admin.register(UserRole)
class UserRoleAdmin(admin.ModelAdmin):
    list_display = ('user', 'role', 'created_at')
    search_fields = ('user__username', 'role__name')
    list_filter = ('role',)
