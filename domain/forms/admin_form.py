from django import forms

from domain.models import Admin


class AdminForm(forms.ModelForm):
    class Meta:
        model = Admin
        fields = ["user", "is_active_admin"]
