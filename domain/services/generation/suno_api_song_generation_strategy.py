import time

import requests
from django.conf import settings

from .generation_result import GenerationResult
from .song_generation_strategy import SongGenerationStrategy
from .suno_generation_error import SunoGenerationError

_GENERATE_URL = "https://api.sunoapi.org/api/v1/generate"
_RECORD_INFO_URL = "https://api.sunoapi.org/api/v1/generate/record-info"

_SUCCESS_STATUS = "SUCCESS"
_TERMINAL_STATUSES = {"SUCCESS", "FAILED", "ERROR"}

_POLL_INTERVAL_SECONDS = 5
_POLL_MAX_ATTEMPTS = 60


class SunoApiSongGenerationStrategy(SongGenerationStrategy):
    """
    Calls the Suno API (sunoapi.org) to generate a real song.

    Flow:
      1. POST /api/v1/generate  → receive taskId
      2. Poll GET /api/v1/generate/record-info?taskId=<id>
         until status reaches SUCCESS (or a failure terminal)
      3. Extract audio_url from the completed record and return GenerationResult
    """

    def __init__(self, api_key: str | None = None):
        self.api_key = api_key or getattr(settings, "SUNO_API_KEY", "")
        self.callback_url = getattr(settings, "SUNO_CALLBACK_URL", "https://example.com/suno/callback")

    def generate(self, request, progress_callback=None) -> GenerationResult:
        if progress_callback:
            progress_callback(15, "Submitting request to Suno")
        task_id = self._submit_generation(request)
        if progress_callback:
            progress_callback(25, "Suno accepted the job")
        record = self._poll_until_complete(task_id, progress_callback=progress_callback)
        return self._build_result(task_id, record)

    def _submit_generation(self, request) -> str:
        payload = {
            "customMode": True,
            "model": "V4",
            "instrumental": False,
            "callBackUrl": self.callback_url,
            "prompt": self._build_prompt(request),
            "title": request.song_name,
            "tags": f"{request.genre} {request.mood}",
        }
        response = requests.post(
            _GENERATE_URL,
            json=payload,
            headers=self._auth_headers(),
            timeout=30,
        )
        response.raise_for_status()
        data = response.json()

        inner = data.get("data") or {}
        task_id = inner.get("taskId") or data.get("taskId")
        if not task_id:
            raise SunoGenerationError(
                f"Suno did not return a taskId. Response: {data}"
            )
        return task_id

    def _poll_until_complete(self, task_id: str, progress_callback=None) -> dict:
        for attempt in range(1, _POLL_MAX_ATTEMPTS + 1):
            record = self._fetch_record(task_id)
            status = record.get("status", "")

            if progress_callback:
                progress = min(90, 25 + attempt)
                progress_callback(progress, f"Suno status: {status or 'PENDING'}")

            if status == _SUCCESS_STATUS:
                return record

            if status in _TERMINAL_STATUSES:
                raise SunoGenerationError(
                    f"Suno generation failed with status '{status}' "
                    f"for taskId '{task_id}'."
                )

            time.sleep(_POLL_INTERVAL_SECONDS)

        raise SunoGenerationError(
            f"Suno generation timed out after "
            f"{_POLL_MAX_ATTEMPTS * _POLL_INTERVAL_SECONDS}s "
            f"for taskId '{task_id}'."
        )

    def _fetch_record(self, task_id: str) -> dict:
        response = requests.get(
            _RECORD_INFO_URL,
            params={"taskId": task_id},
            headers=self._auth_headers(),
            timeout=15,
        )
        response.raise_for_status()
        data = response.json()
        inner = data.get("data")
        if isinstance(inner, dict):
            return inner
        if isinstance(inner, list):
            return {"clips": inner, "status": data.get("status", "")}
        return data if isinstance(data, dict) else {}

    def _build_result(self, task_id: str, record: dict) -> GenerationResult:
        suno_data = record.get("response", {}).get("sunoData") or []
        clips = suno_data or record.get("clips") or record.get("songs") or []
        audio_url = ""
        for clip in clips:
            url = clip.get("audioUrl") or clip.get("audio_url") or clip.get("sourceAudioUrl") or ""
            if url:
                audio_url = url
                break

        if not audio_url:
            raise SunoGenerationError(
                f"Suno returned SUCCESS for taskId '{task_id}' "
                "but no audio_url was found in the response."
            )

        return GenerationResult(
            audio_url=audio_url,
            generation_id=task_id,
            metadata={
                "strategy": "suno",
                "task_id": task_id,
                "status": record.get("status"),
                "clips": clips,
            },
        )

    def _auth_headers(self) -> dict:
        return {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }

    def _build_prompt(self, request) -> str:
        parts = [f"{request.genre} {request.mood} song titled '{request.song_name}'"]
        if request.singer_style:
            parts.append(f"in the style of {request.singer_style}")
        if request.description:
            parts.append(request.description)
        return ". ".join(parts)
