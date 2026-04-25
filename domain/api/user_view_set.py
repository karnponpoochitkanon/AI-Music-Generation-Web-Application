from rest_framework import viewsets

from domain.models import User
from domain.serializers import UserSerializer


class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.order_by("created_at")
    serializer_class = UserSerializer
