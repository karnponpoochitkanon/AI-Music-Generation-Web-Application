from rest_framework import viewsets

from domain.models import AdminAction
from domain.serializers import AdminActionSerializer


class AdminActionViewSet(viewsets.ModelViewSet):
    queryset = AdminAction.objects.order_by("created_at")
    serializer_class = AdminActionSerializer
