from rest_framework import serializers

from domain.models import MusicGenerationRequest


class MusicGenerationRequestSerializer(serializers.ModelSerializer):
    class Meta:
        model = MusicGenerationRequest
        fields = [
            "request_id",
            "user",
            "song_name",
            "genre",
            "mood",
            "singer_style",
            "description",
            "generation_status",
            "progress_percent",
            "generation_error",
            "generation_id",
            "generation_metadata",
            "started_at",
            "completed_at",
            "produced_song",
        ]
        read_only_fields = [
            "request_id",
            "generation_status",
            "progress_percent",
            "generation_error",
            "generation_id",
            "generation_metadata",
            "started_at",
            "completed_at",
            "produced_song",
        ]
