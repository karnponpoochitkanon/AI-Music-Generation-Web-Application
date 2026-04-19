from django.conf import settings

from .base import SongGenerationStrategy
from .mock_strategy import MockSongGenerationStrategy
from .suno_strategy import SunoApiSongGenerationStrategy

# Registry maps the value of SONG_GENERATION_STRATEGY to its strategy class.
# Add new strategies here — nowhere else needs to change.
_REGISTRY: dict[str, type[SongGenerationStrategy]] = {
    "mock": MockSongGenerationStrategy,
    "suno": SunoApiSongGenerationStrategy,
}


def get_strategy() -> SongGenerationStrategy:
    """
    Return the active strategy instance based on the SONG_GENERATION_STRATEGY
    Django setting (default: "mock").

    Raises ValueError for unrecognised strategy names so misconfiguration
    is caught at startup rather than silently falling back.
    """
    name = getattr(settings, "SONG_GENERATION_STRATEGY", "mock").strip().lower()
    strategy_class = _REGISTRY.get(name)
    if strategy_class is None:
        valid = ", ".join(sorted(_REGISTRY))
        raise ValueError(
            f"Unknown SONG_GENERATION_STRATEGY '{name}'. "
            f"Valid options are: {valid}."
        )
    return strategy_class()
