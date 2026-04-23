import uuid
import time

from .base import GenerationResult, SongGenerationStrategy

# Namespace UUID used to derive deterministic IDs from request data.
_MOCK_NAMESPACE = uuid.UUID("a1b2c3d4-e5f6-7890-abcd-ef1234567890")

# Stable placeholder file served locally — no network required.
MOCK_AUDIO_URL = "/static/audio/mock_placeholder.mp3"


class MockSongGenerationStrategy(SongGenerationStrategy):
    """
    Offline deterministic strategy — no external API calls.

    Given the same MusicGenerationRequest, this strategy always returns
    the identical GenerationResult, making it safe for automated tests
    and development without network access.

    Determinism is achieved via uuid5: the generation_id is derived from
    the request's primary key, so it is stable across multiple calls.
    """

    def generate(self, request, progress_callback=None) -> GenerationResult:
        # uuid5 is deterministic: same request_id → same generation_id every time.
        generation_id = str(uuid.uuid5(_MOCK_NAMESPACE, str(request.request_id)))

        if progress_callback:
          progress_callback(20, "Composing melody layers")
        time.sleep(1.0)
        if progress_callback:
          progress_callback(55, "Arranging mock instrumentation")
        time.sleep(1.0)
        if progress_callback:
          progress_callback(85, "Rendering preview audio")
        time.sleep(0.8)

        return GenerationResult(
            audio_url=MOCK_AUDIO_URL,
            generation_id=generation_id,
            metadata={
                "strategy": "mock",
                "request_id": str(request.request_id),
                "song_name": request.song_name,
                "genre": request.genre,
                "mood": request.mood,
                "singer_style": request.singer_style,
                "description": request.description,
                "duration_seconds": 180,
                "bpm": 120,
                "key": "C major",
            },
        )
