import time

import requests
from django.conf import settings

from .base import GenerationResult, SongGenerationStrategy

# Suno API v1 endpoints
_GENERATE_URL = "https://api.sunoapi.org/api/v1/generate"
_RECORD_INFO_URL = "https://api.sunoapi.org/api/v1/generate/record-info"

# Terminal statuses — polling stops when one of these is reached
_SUCCESS_STATUS = "SUCCESS"
_TERMINAL_STATUSES = {"SUCCESS", "FAILED", "ERROR"}

# Polling configuration
_POLL_INTERVAL_SECONDS = 5
_POLL_MAX_ATTEMPTS = 60  # 5 min total ceiling


class SunoGenerationError(Exception):
    """Raised when the Suno API returns a failure or times out."""


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

    # Strategy interface

    def generate(self, request) -> GenerationResult:
        task_id = self._submit_generation(request)
        record = self._poll_until_complete(task_id)
        return self._build_result(task_id, record)


    # Step 1 — submit generation task
    def _submit_generation(self, request) -> str:
        payload = {
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

        task_id = data.get("data", {}).get("taskId") or data.get("taskId")
        if not task_id:
            raise SunoGenerationError(
                f"Suno did not return a taskId. Response: {data}"
            )
        return task_id

    # Step 2 — poll record-info until terminal status
    def _poll_until_complete(self, task_id: str) -> dict:
        for attempt in range(1, _POLL_MAX_ATTEMPTS + 1):
            record = self._fetch_record(task_id)
            status = record.get("status", "")

            if status == _SUCCESS_STATUS:
                return record

            if status in _TERMINAL_STATUSES:
                raise SunoGenerationError(
                    f"Suno generation failed with status '{status}' "
                    f"for taskId '{task_id}'."
                )

            # PENDING / TEXT_SUCCESS / FIRST_SUCCESS — keep waiting
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
        # The record is nested under "data" in the Suno response envelope
        return data.get("data", data)

    # Step 3 — build GenerationResult from completed record
    def _build_result(self, task_id: str, record: dict) -> GenerationResult:
        # Suno returns a list of clips; take the first available audio URL
        clips = record.get("clips") or record.get("songs") or []
        audio_url = ""
        if clips:
            audio_url = clips[0].get("audio_url") or clips[0].get("audioUrl", "")

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

    # Helpers
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
