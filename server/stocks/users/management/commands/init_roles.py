from django.core.management.base import BaseCommand
from django.contrib.auth.models import Permission, ContentType
from django.contrib.auth import get_user_model
from users.models import Role, UserRole

User = get_user_model()


class Command(BaseCommand):
    help = '初始化基础角色和权限'

    def handle(self, *args, **options):
        self.stdout.write('开始初始化角色和权限...')
        
        # 创建基础角色
        admin_role, created = Role.objects.get_or_create(
            name='管理员',
            defaults={'description': '系统管理员，拥有全部权限'}
        )
        if created:
            self.stdout.write(self.style.SUCCESS('创建管理员角色成功'))
        
        user_role, created = Role.objects.get_or_create(
            name='普通用户',
            defaults={'description': '普通用户，拥有基本权限'}
        )
        if created:
            self.stdout.write(self.style.SUCCESS('创建普通用户角色成功'))
        
        # 获取所有权限
        all_permissions = Permission.objects.all()
        
        # 为管理员角色分配所有权限
        admin_role.permissions.set(all_permissions)
        self.stdout.write(self.style.SUCCESS(f'为管理员角色分配了 {all_permissions.count()} 个权限'))
        
        # 为普通用户分配查看权限
        view_permissions = Permission.objects.filter(codename__startswith='view_')
        user_role.permissions.set(view_permissions)
        self.stdout.write(self.style.SUCCESS(f'为普通用户角色分配了 {view_permissions.count()} 个权限'))
        
        # 确保超级用户拥有管理员角色
        superusers = User.objects.filter(is_superuser=True)
        for user in superusers:
            UserRole.objects.get_or_create(user=user, role=admin_role)
            self.stdout.write(self.style.SUCCESS(f'为超级用户 {user.username} 分配管理员角色'))
        
        self.stdout.write(self.style.SUCCESS('角色和权限初始化完成')) 