from rest_framework import serializers

from domain.models import User


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = [
            "user_id",
            "email",
            "display_name",
            "username",
            "profile_image_url",
            "account_status",
            "created_at",
        ]
        read_only_fields = ["user_id", "created_at"]
