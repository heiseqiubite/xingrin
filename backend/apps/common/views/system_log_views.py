import logging

from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_exempt
from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.common.services.system_log_service import SystemLogService


logger = logging.getLogger(__name__)


@method_decorator(csrf_exempt, name="dispatch")
class SystemLogsView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.service = SystemLogService()

    def get(self, request):
        try:
            lines_raw = request.query_params.get("lines")
            lines = int(lines_raw) if lines_raw is not None else None

            content = self.service.get_logs_content(lines=lines)
            return Response({"content": content})
        except ValueError:
            return Response({"error": "lines 参数必须是整数"}, status=status.HTTP_400_BAD_REQUEST)
        except Exception:
            logger.exception("获取系统日志失败")
            return Response({"error": "获取系统日志失败"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
