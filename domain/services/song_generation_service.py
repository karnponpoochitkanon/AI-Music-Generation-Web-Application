from django.utils import timezone

from domain.models import MusicGenerationRequest, Song

from .generation import SongGenerationStrategy, SongGenerator


class SongGenerationService:
    """Orchestrates strategy execution and persists resulting Song to the database."""

    def __init__(self, strategy: SongGenerationStrategy):
        self._generator = SongGenerator(strategy)

    def set_strategy(self, strategy: SongGenerationStrategy) -> None:
        self._generator.set_strategy(strategy)

    def execute(self, request: MusicGenerationRequest) -> tuple:
        """Returns (Song, GenerationResult) so callers can access generation metadata."""
        result = self._generator.generate(request)

        song = Song.objects.create(
            title=request.song_name,
            owner=request.user,
            audio_url=result.audio_url,
        )

        request.produced_song = song
        request.completed_at = timezone.now()
        request.save(update_fields=["produced_song", "completed_at"])

        return song, result
