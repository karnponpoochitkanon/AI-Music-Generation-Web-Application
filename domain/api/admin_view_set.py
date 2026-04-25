from rest_framework import viewsets

from domain.models import Admin
from domain.serializers import AdminSerializer


class AdminViewSet(viewsets.ModelViewSet):
    queryset = Admin.objects.order_by("created_at")
    serializer_class = AdminSerializer
