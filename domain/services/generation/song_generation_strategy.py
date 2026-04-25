from abc import ABC, abstractmethod

from .generation_result import GenerationResult


class SongGenerationStrategy(ABC):
    """Abstract strategy — all concrete strategies must implement generate()."""

    @abstractmethod
    def generate(self, request, progress_callback=None) -> GenerationResult:
        """
        Generate a song from a MusicGenerationRequest.

        Args:
            request: MusicGenerationRequest domain object

        Returns:
            GenerationResult containing at least audio_url
        """
