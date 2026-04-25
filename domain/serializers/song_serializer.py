from rest_framework import serializers

from domain.models import Song


class SongSerializer(serializers.ModelSerializer):
    class Meta:
        model = Song
        fields = ["song_id", "title", "owner", "audio_url", "visibility", "created_at"]
        read_only_fields = ["song_id", "created_at"]
