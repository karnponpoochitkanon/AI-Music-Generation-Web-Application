from django import forms

from domain.models import Song


class SongForm(forms.ModelForm):
    class Meta:
        model = Song
        fields = ["title", "owner", "audio_url", "visibility"]
