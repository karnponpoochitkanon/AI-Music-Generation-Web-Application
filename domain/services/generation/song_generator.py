from .generation_result import GenerationResult
from .song_generation_strategy import SongGenerationStrategy


class SongGenerator:
    """Context — holds a strategy and delegates generation to it."""

    def __init__(self, strategy: SongGenerationStrategy):
        self._strategy = strategy

    def set_strategy(self, strategy: SongGenerationStrategy) -> None:
        self._strategy = strategy

    def generate(self, request, progress_callback=None) -> GenerationResult:
        return self._strategy.generate(request, progress_callback=progress_callback)
