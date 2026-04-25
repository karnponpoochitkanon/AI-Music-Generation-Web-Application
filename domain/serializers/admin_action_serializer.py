from rest_framework import serializers

from domain.models import AdminAction


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
