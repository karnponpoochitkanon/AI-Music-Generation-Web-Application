from rest_framework import viewsets

from domain.models import Song
from domain.serializers import SongSerializer


class SongViewSet(viewsets.ModelViewSet):
    queryset = Song.objects.order_by("created_at")
    serializer_class = SongSerializer
