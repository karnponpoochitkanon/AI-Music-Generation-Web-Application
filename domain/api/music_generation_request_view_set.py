from rest_framework import viewsets

from domain.models import MusicGenerationRequest
from domain.serializers import MusicGenerationRequestSerializer


class MusicGenerationRequestViewSet(viewsets.ModelViewSet):
    queryset = MusicGenerationRequest.objects.order_by("song_name")
    serializer_class = MusicGenerationRequestSerializer
