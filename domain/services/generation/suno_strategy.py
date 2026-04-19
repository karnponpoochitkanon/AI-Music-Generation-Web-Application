import requests
from django.conf import settings

from .base import GenerationResult, SongGenerationStrategy


class SunoApiSongGenerationStrategy(SongGenerationStrategy):
    """Calls the Suno API to generate a real song."""

    DEFAULT_BASE_URL = "https://api.sunoapi.org"

    def __init__(self, api_key: str | None = None, base_url: str | None = None):
        self.api_key = api_key or getattr(settings, "SUNO_API_KEY", "")
        self.base_url = base_url or getattr(settings, "SUNO_API_URL", self.DEFAULT_BASE_URL)

    def generate(self, request) -> GenerationResult:
        payload = {
            "prompt": self._build_prompt(request),
            "title": request.song_name,
            "tags": f"{request.genre} {request.mood}",
        }
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }
        response = requests.post(
            f"{self.base_url}/api/generate",
            json=payload,
            headers=headers,
            timeout=30,
        )
        response.raise_for_status()
        data = response.json()
        return GenerationResult(
            audio_url=data["audio_url"],
            generation_id=data.get("id"),
            metadata={"strategy": "suno", "raw_response": data},
        )

    def _build_prompt(self, request) -> str:
        parts = [f"{request.genre} {request.mood} song titled '{request.song_name}'"]
        if request.singer_style:
            parts.append(f"in the style of {request.singer_style}")
        if request.description:
            parts.append(request.description)
        return ". ".join(parts)
