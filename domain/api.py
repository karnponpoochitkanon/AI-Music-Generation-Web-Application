from rest_framework import viewsets

from .models import Admin, AdminAction, MusicGenerationRequest, Song, User
from .serializers import (
    AdminActionSerializer,
    AdminSerializer,
    MusicGenerationRequestSerializer,
    SongSerializer,
    UserSerializer,
)


class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.order_by("created_at")
    serializer_class = UserSerializer


class AdminViewSet(viewsets.ModelViewSet):
    queryset = Admin.objects.order_by("created_at")
    serializer_class = AdminSerializer


class SongViewSet(viewsets.ModelViewSet):
    queryset = Song.objects.order_by("created_at")
    serializer_class = SongSerializer


class MusicGenerationRequestViewSet(viewsets.ModelViewSet):
    queryset = MusicGenerationRequest.objects.order_by("song_name")
    serializer_class = MusicGenerationRequestSerializer


class AdminActionViewSet(viewsets.ModelViewSet):
    queryset = AdminAction.objects.order_by("created_at")
    serializer_class = AdminActionSerializer
