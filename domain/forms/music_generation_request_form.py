from django import forms

from domain.models import MusicGenerationRequest


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
        ]
