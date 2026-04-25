from django import forms

from domain.models import User


class UserForm(forms.ModelForm):
    class Meta:
        model = User
        fields = [
            "email",
            "display_name",
            "username",
            "profile_image_url",
            "account_status",
        ]
