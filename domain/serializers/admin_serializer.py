from rest_framework import serializers

from domain.models import Admin


class AdminSerializer(serializers.ModelSerializer):
    class Meta:
        model = Admin
        fields = ["user", "is_active_admin", "created_at"]
        read_only_fields = ["created_at"]
