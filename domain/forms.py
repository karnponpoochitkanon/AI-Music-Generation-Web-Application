from django import forms

from .models import Admin, AdminAction, MusicGenerationRequest, Song, User


class UserForm(forms.ModelForm):
    class Meta:
        model = User
        fields = ["email", "account_status"]


class AdminForm(forms.ModelForm):
    class Meta:
        model = Admin
        fields = ["user", "is_active_admin"]


class SongForm(forms.ModelForm):
    class Meta:
        model = Song
        fields = ["title", "owner", "audio_url", "visibility"]


class MusicGenerationRequestForm(forms.ModelForm):
    class Meta:
        model = MusicGenerationRequest
        fields = [
            "user",
            "song_name",
            "genre",
            "mood",
            "singer_style",
            "description",
            "completed_at",
            "produced_song",
        ]


class AdminActionForm(forms.ModelForm):
    class Meta:
        model = AdminAction
        fields = ["target_user", "action_type", "performed_by", "reason"]
