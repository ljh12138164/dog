"""
自定义中间件，用于处理CSRF豁免
"""
from django.conf import settings
from django.utils.deprecation import MiddlewareMixin
import re


class CSRFExemptMiddleware(MiddlewareMixin):
    """
    为指定的URL路径豁免CSRF验证的中间件
    """
    def __init__(self, get_response):
        self.get_response = get_response
        # 编译正则表达式，用于匹配应该被豁免的路径
        self.exempt_urls = [re.compile(url) for url in getattr(settings, 'CSRF_EXEMPT_URLS', [])]

    def process_view(self, request, view_func, view_args, view_kwargs):
        # 检查当前请求的路径是否在豁免列表中
        path = request.path_info
        for exempt_url in self.exempt_urls:
            if exempt_url.match(path):
                # 如果匹配，将请求标记为CSRF豁免
                request._dont_enforce_csrf_checks = True
                break
        
        # 这里返回None表示中间件的处理链将继续
        return None 