from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model

User = get_user_model()


class Command(BaseCommand):
    help = '创建超级用户'

    def add_arguments(self, parser):
        parser.add_argument('--username', type=str, default='admin', help='超级用户用户名')
        parser.add_argument('--email', type=str, default='admin@example.com', help='超级用户邮箱')
        parser.add_argument('--password', type=str, default='admin123', help='超级用户密码')

    def handle(self, *args, **options):
        username = options['username']
        email = options['email']
        password = options['password']
        
        if User.objects.filter(username=username).exists():
            self.stdout.write(self.style.WARNING(f'用户 {username} 已存在'))
            return
        
        User.objects.create_superuser(
            username=username,
            email=email,
            password=password
        )
        
        self.stdout.write(self.style.SUCCESS(f'成功创建超级用户 {username}')) 