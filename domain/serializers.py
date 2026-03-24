from rest_framework import serializers

from .models import Admin, AdminAction, MusicGenerationRequest, Song, User


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["user_id", "email", "account_status", "created_at"]
        read_only_fields = ["user_id", "created_at"]


class AdminSerializer(serializers.ModelSerializer):
    class Meta:
        model = Admin
        fields = ["user", "is_active_admin", "created_at"]
        read_only_fields = ["created_at"]


class SongSerializer(serializers.ModelSerializer):
    class Meta:
        model = Song
        fields = ["song_id", "title", "owner", "audio_url", "visibility", "created_at"]
        read_only_fields = ["song_id", "created_at"]


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
            "completed_at",
            "produced_song",
        ]
        read_only_fields = ["request_id"]


class AdminActionSerializer(serializers.ModelSerializer):
    class Meta:
        model = AdminAction
        fields = [
            "action_id",
            "target_user",
            "action_type",
            "performed_by",
            "reason",
            "created_at",
        ]
        read_only_fields = ["action_id", "created_at"]
