from abc import ABC, abstractmethod
from dataclasses import dataclass, field


@dataclass
class GenerationResult:
    audio_url: str
    generation_id: str | None = None
    metadata: dict = field(default_factory=dict)


class SongGenerationStrategy(ABC):
    """Abstract strategy — all concrete strategies must implement generate()."""

    @abstractmethod
    def generate(self, request) -> GenerationResult:
        """
        Generate a song from a MusicGenerationRequest.

        Args:
            request: MusicGenerationRequest domain object

        Returns:
            GenerationResult containing at least audio_url
        """
