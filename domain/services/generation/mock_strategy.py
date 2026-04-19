import uuid

from .base import GenerationResult, SongGenerationStrategy


class MockSongGenerationStrategy(SongGenerationStrategy):
    """Offline deterministic strategy — no external calls, safe for testing."""

    BASE_URL = "https://mock-audio.example.com"

    def generate(self, request) -> GenerationResult:
        fake_id = str(uuid.uuid4())
        audio_url = f"{self.BASE_URL}/{fake_id}.mp3"
        return GenerationResult(
            audio_url=audio_url,
            generation_id=fake_id,
            metadata={
                "strategy": "mock",
                "request_id": str(request.request_id),
                "song_name": request.song_name,
                "genre": request.genre,
                "mood": request.mood,
            },
        )
