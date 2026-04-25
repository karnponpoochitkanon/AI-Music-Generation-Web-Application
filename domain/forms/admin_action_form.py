from django import forms

from domain.models import AdminAction


class AdminActionForm(forms.ModelForm):
    class Meta:
        model = AdminAction
        fields = ["target_user", "action_type", "performed_by", "reason"]
