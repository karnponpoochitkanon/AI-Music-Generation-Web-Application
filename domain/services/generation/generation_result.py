from dataclasses import dataclass, field


@dataclass
class GenerationResult:
    audio_url: str
    generation_id: str | None = None
    metadata: dict = field(default_factory=dict)
