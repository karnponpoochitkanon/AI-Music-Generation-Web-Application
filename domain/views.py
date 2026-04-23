import json
from io import BytesIO
from functools import wraps
from threading import Thread
import math
import re
import wave

from django.conf import settings
from django.db import models
from django.http import HttpResponse, HttpResponseNotAllowed, JsonResponse
from django.shortcuts import render
from django.shortcuts import get_object_or_404, redirect
from django.utils import timezone
from django.views.decorators.csrf import csrf_exempt
import requests

from .forms import (
    AdminActionForm,
    AdminForm,
    MusicGenerationRequestForm,
    SongForm,
    UserForm,
)
from .models import Admin, AdminAction, MusicGenerationRequest, Song, User
from .services.generation import get_strategy
from .services.song_generation_service import SongGenerationService


def index(request):
    return redirect("swagger-ui")


def demo(request):
    active_strategy = getattr(settings, "SONG_GENERATION_STRATEGY", "mock")
    return render(request, "demo.html", {"active_strategy": active_strategy})


def _parse_json_body(request):
    if not request.body:
        return {}
    try:
        return json.loads(request.body)
    except json.JSONDecodeError:
        return None


def _validation_error_response(form):
    return JsonResponse({"errors": form.errors}, status=400)


def _serialize_auth_user(app_user, google_profile=None):
    display_name = app_user.display_name
    if not display_name and google_profile:
        display_name = google_profile.get("name", "")

    payload = {
        "userId": str(app_user.user_id),
        "email": app_user.email,
        "displayName": display_name,
        "username": app_user.username,
        "profileImageUrl": app_user.profile_image_url,
        "profileComplete": app_user.is_profile_complete,
        "accountStatus": app_user.account_status,
    }

    if google_profile:
        payload["googleSub"] = google_profile.get("sub")
        payload["googleName"] = google_profile.get("name")
        payload["googlePicture"] = google_profile.get("picture")

    return payload


def _get_session_auth_user(request):
    auth_user = request.session.get("auth_user")
    if not auth_user:
        return None

    try:
        return User.objects.get(user_id=auth_user["userId"])
    except (KeyError, User.DoesNotExist, ValueError):
        request.session.pop("auth_user", None)
        return None


def _get_optional_app_user(request):
    return _get_session_auth_user(request)


def _require_app_auth(view_func):
    @wraps(view_func)
    def wrapped(request, *args, **kwargs):
        app_user = _get_session_auth_user(request)
        if not app_user:
            return JsonResponse({"error": "Authentication required."}, status=401)

        request.app_user = app_user
        return view_func(request, *args, **kwargs)

    return wrapped


def _verify_google_id_token(credential):
    if not settings.GOOGLE_OAUTH_CLIENT_ID:
        raise ValueError("GOOGLE_OAUTH_CLIENT_ID is not configured on the server.")

    response = requests.get(
        "https://oauth2.googleapis.com/tokeninfo",
        params={"id_token": credential},
        timeout=10,
    )

    if response.status_code != 200:
        raise ValueError("Google token verification failed.")

    token_info = response.json()

    if token_info.get("aud") != settings.GOOGLE_OAUTH_CLIENT_ID:
        raise ValueError("Google token audience does not match this application.")

    if token_info.get("email_verified") != "true":
        raise ValueError("Google account email is not verified.")

    return token_info


def _serialize_user(obj):
    return {
        "user_id": str(obj.user_id),
        "email": obj.email,
        "display_name": obj.display_name,
        "username": obj.username,
        "profile_image_url": obj.profile_image_url,
        "account_status": obj.account_status,
        "created_at": obj.created_at.isoformat(),
    }


def _serialize_admin(obj):
    return {
        "user_id": str(obj.user_id),
        "is_active_admin": obj.is_active_admin,
        "created_at": obj.created_at.isoformat(),
    }


def _serialize_song(obj):
    source_request = getattr(obj, "produced_from_request", None)
    return {
        "song_id": str(obj.song_id),
        "title": obj.title,
        "owner_id": str(obj.owner_id),
        "audio_url": obj.audio_url,
        "visibility": obj.visibility,
        "created_at": obj.created_at.isoformat(),
        "generation_request": (
            {
                "request_id": str(source_request.request_id),
                "song_name": source_request.song_name,
                "genre": source_request.genre,
                "mood": source_request.mood,
                "singer_style": source_request.singer_style,
                "description": source_request.description,
                "generation_status": source_request.generation_status,
                "generation_id": source_request.generation_id,
                "generation_metadata": source_request.generation_metadata,
                "started_at": source_request.started_at.isoformat()
                if source_request.started_at
                else None,
                "completed_at": source_request.completed_at.isoformat()
                if source_request.completed_at
                else None,
            }
            if source_request
            else None
        ),
    }


def _sanitize_filename(value):
    slug = re.sub(r"[^A-Za-z0-9._-]+", "_", value).strip("._")
    return slug or "song"


def _build_mock_audio_download(song_title):
    sample_rate = 22050
    duration_seconds = 4
    frame_count = sample_rate * duration_seconds
    frequencies = (261.63, 329.63, 392.0, 523.25)
    volume = 0.32
    buffer = BytesIO()

    with wave.open(buffer, "wb") as wav_file:
        wav_file.setnchannels(1)
        wav_file.setsampwidth(2)
        wav_file.setframerate(sample_rate)

        for index in range(frame_count):
            time_point = index / sample_rate
            sample = sum(
                math.sin(2 * math.pi * frequency * time_point) for frequency in frequencies
            ) / len(frequencies)
            amplitude = int(max(-1, min(1, sample * volume)) * 32767)
            wav_file.writeframesraw(amplitude.to_bytes(2, byteorder="little", signed=True))

    response = HttpResponse(buffer.getvalue(), content_type="audio/wav")
    response["Content-Disposition"] = (
        f'attachment; filename="{_sanitize_filename(song_title)}.wav"'
    )
    return response


def _serialize_song_summary(obj, message):
    return {
        "message": message,
        "id": str(obj.song_id),
        "title": obj.title,
    }


def _serialize_generation_request(obj):
    return {
        "request_id": str(obj.request_id),
        "user_id": str(obj.user_id),
        "song_name": obj.song_name,
        "genre": obj.genre,
        "mood": obj.mood,
        "singer_style": obj.singer_style,
        "description": obj.description,
        "generation_status": obj.generation_status,
        "progress_percent": obj.progress_percent,
        "generation_error": obj.generation_error,
        "generation_id": obj.generation_id,
        "generation_metadata": obj.generation_metadata,
        "started_at": obj.started_at.isoformat() if obj.started_at else None,
        "completed_at": obj.completed_at.isoformat() if obj.completed_at else None,
        "produced_song_id": str(obj.produced_song_id) if obj.produced_song_id else None,
    }


def _serialize_admin_action(obj):
    return {
        "action_id": str(obj.action_id),
        "target_user_id": str(obj.target_user_id),
        "action_type": obj.action_type,
        "performed_by_id": str(obj.performed_by_id),
        "reason": obj.reason,
        "created_at": obj.created_at.isoformat(),
    }


def _serialize_generation_status(obj):
    return {
        "request_id": str(obj.request_id),
        "status": obj.generation_status,
        "progress_percent": obj.progress_percent,
        "error": obj.generation_error,
        "generation_id": obj.generation_id,
        "metadata": obj.generation_metadata,
        "song": _serialize_song(obj.produced_song) if obj.produced_song else None,
        "completed_at": obj.completed_at.isoformat() if obj.completed_at else None,
    }


def _update_generation_progress(request_id, progress_percent, detail):
    metadata = {}
    if detail:
        metadata["progress_detail"] = detail

    MusicGenerationRequest.objects.filter(request_id=request_id).update(
        generation_status=MusicGenerationRequest.GenerationStatus.PROCESSING,
        progress_percent=progress_percent,
        generation_metadata=metadata,
    )


def _run_generation_job(request_id):
    generation_request = MusicGenerationRequest.objects.get(request_id=request_id)

    try:
        service = SongGenerationService(get_strategy())
        song, result = service.execute(
            generation_request,
            progress_callback=lambda progress, detail: _update_generation_progress(
                request_id,
                progress,
                detail,
            ),
        )
        MusicGenerationRequest.objects.filter(request_id=request_id).update(
            generation_status=MusicGenerationRequest.GenerationStatus.COMPLETED,
            progress_percent=100,
            generation_error="",
            generation_id=result.generation_id or "",
            generation_metadata=result.metadata,
            completed_at=timezone.now(),
            produced_song=song,
        )
    except Exception as exc:
        MusicGenerationRequest.objects.filter(request_id=request_id).update(
            generation_status=MusicGenerationRequest.GenerationStatus.FAILED,
            progress_percent=100,
            generation_error=str(exc),
            completed_at=timezone.now(),
        )


RESOURCE_CONFIG = {
    "users": {
        "model": User,
        "form": UserForm,
        "serializer": _serialize_user,
        "lookup_field": "user_id",
        "list_ordering": "created_at",
        "id_field": "user_id",
    },
    "admins": {
        "model": Admin,
        "form": AdminForm,
        "serializer": _serialize_admin,
        "lookup_field": "user_id",
        "list_ordering": "created_at",
        "id_field": "user_id",
    },
    "songs": {
        "model": Song,
        "form": SongForm,
        "serializer": _serialize_song,
        "lookup_field": "song_id",
        "list_ordering": "created_at",
        "id_field": "song_id",
    },
    "requests": {
        "model": MusicGenerationRequest,
        "form": MusicGenerationRequestForm,
        "serializer": _serialize_generation_request,
        "lookup_field": "request_id",
        "list_ordering": "song_name",
        "id_field": "request_id",
    },
    "admin-actions": {
        "model": AdminAction,
        "form": AdminActionForm,
        "serializer": _serialize_admin_action,
        "lookup_field": "action_id",
        "list_ordering": "created_at",
        "id_field": "action_id",
    },
}


def _resource_list_create(request, resource_name):
    config = RESOURCE_CONFIG[resource_name]
    if request.method == "GET":
        queryset = config["model"].objects.order_by(config["list_ordering"])

        if resource_name == "users":
            queryset = queryset.filter(user_id=request.app_user.user_id)
        elif resource_name == "requests":
            queryset = queryset.filter(user=request.app_user)
        elif resource_name == "songs":
            queryset = queryset.filter(owner=request.app_user).select_related(
                "produced_from_request"
            )

        data = [config["serializer"](obj) for obj in queryset]
        return JsonResponse({"count": len(data), "results": data})

    if request.method == "POST":
        payload = _parse_json_body(request)
        if payload is None:
            return JsonResponse({"error": "Invalid JSON payload."}, status=400)

        if resource_name == "users":
            payload["email"] = request.app_user.email
            payload["account_status"] = request.app_user.account_status
        elif resource_name == "requests":
            payload["user"] = str(request.app_user.user_id)
        elif resource_name == "songs":
            payload["owner"] = str(request.app_user.user_id)

        form = config["form"](payload)
        if not form.is_valid():
            return _validation_error_response(form)

        obj = form.save()
        return JsonResponse(config["serializer"](obj), status=201)

    return HttpResponseNotAllowed(["GET", "POST"])


def _resource_detail(request, resource_name, pk):
    config = RESOURCE_CONFIG[resource_name]
    lookup = {config["lookup_field"]: pk}

    if resource_name == "users":
        lookup["user_id"] = request.app_user.user_id
    elif resource_name == "requests":
        lookup["user"] = request.app_user
    elif resource_name == "songs":
        lookup["owner"] = request.app_user

    queryset = config["model"].objects
    if resource_name == "songs":
        queryset = queryset.select_related("produced_from_request")

    obj = get_object_or_404(queryset, **lookup)

    if request.method == "GET":
        return JsonResponse(config["serializer"](obj))

    if request.method == "PUT":
        payload = _parse_json_body(request)
        if payload is None:
            return JsonResponse({"error": "Invalid JSON payload."}, status=400)

        if resource_name == "users":
            payload["email"] = request.app_user.email
            payload["account_status"] = request.app_user.account_status
        elif resource_name == "requests":
            payload["user"] = str(request.app_user.user_id)
        elif resource_name == "songs":
            payload["owner"] = str(request.app_user.user_id)

        form = config["form"](payload, instance=obj)
        if not form.is_valid():
            return _validation_error_response(form)

        updated_obj = form.save()
        return JsonResponse(config["serializer"](updated_obj))

    if request.method == "DELETE":
        obj.delete()
        return JsonResponse({}, status=204)

    return HttpResponseNotAllowed(["GET", "PUT", "DELETE"])


@csrf_exempt
def google_auth_login(request):
    if request.method != "POST":
        return HttpResponseNotAllowed(["POST"])

    payload = _parse_json_body(request)
    if payload is None:
        return JsonResponse({"error": "Invalid JSON payload."}, status=400)

    credential = payload.get("credential")
    if not credential:
        return JsonResponse({"error": "Missing Google credential."}, status=400)

    try:
        google_profile = _verify_google_id_token(credential)
    except ValueError as exc:
        return JsonResponse({"error": str(exc)}, status=401)

    app_user, _ = User.objects.get_or_create(
        email=google_profile["email"],
        defaults={"account_status": "ACTIVE"},
    )

    if app_user.account_status != "ACTIVE":
        return JsonResponse({"error": "This account is not allowed to sign in."}, status=403)

    serialized_user = _serialize_auth_user(app_user, google_profile)
    request.session["auth_user"] = serialized_user
    request.session.modified = True

    return JsonResponse({"user": serialized_user})


@csrf_exempt
def auth_session(request):
    if request.method != "GET":
        return HttpResponseNotAllowed(["GET"])

    app_user = _get_session_auth_user(request)
    if not app_user:
        return JsonResponse({"authenticated": False, "user": None}, status=200)

    auth_user = request.session.get("auth_user", {})
    auth_user = {
        **auth_user,
        **_serialize_auth_user(app_user),
    }
    request.session["auth_user"] = auth_user

    return JsonResponse({"authenticated": True, "user": auth_user})


@csrf_exempt
@_require_app_auth
def auth_profile(request):
    if request.method == "GET":
        auth_user = {
            **request.session.get("auth_user", {}),
            **_serialize_auth_user(request.app_user),
        }
        request.session["auth_user"] = auth_user
        return JsonResponse({"user": auth_user})

    if request.method != "PUT":
        return HttpResponseNotAllowed(["GET", "PUT"])

    payload = _parse_json_body(request)
    if payload is None:
        return JsonResponse({"error": "Invalid JSON payload."}, status=400)

    payload["email"] = request.app_user.email
    payload["display_name"] = payload.get("display_name") or request.app_user.display_name
    payload["account_status"] = request.app_user.account_status

    form = UserForm(payload, instance=request.app_user)
    if not form.is_valid():
        return _validation_error_response(form)

    app_user = form.save()
    auth_user = {
        **request.session.get("auth_user", {}),
        **_serialize_auth_user(app_user),
    }
    request.session["auth_user"] = auth_user
    request.session.modified = True

    return JsonResponse({"user": auth_user})


@csrf_exempt
def auth_logout(request):
    if request.method != "POST":
        return HttpResponseNotAllowed(["POST"])

    request.session.flush()
    return JsonResponse({"message": "Logged out."})


@csrf_exempt
@_require_app_auth
def users_collection(request):
    return _resource_list_create(request, "users")


@csrf_exempt
@_require_app_auth
def user_detail(request, pk):
    return _resource_detail(request, "users", pk)


@csrf_exempt
@_require_app_auth
def admins_collection(request):
    return _resource_list_create(request, "admins")


@csrf_exempt
@_require_app_auth
def admin_detail(request, pk):
    return _resource_detail(request, "admins", pk)


@csrf_exempt
@_require_app_auth
def songs_collection(request):
    return _resource_list_create(request, "songs")


@csrf_exempt
@_require_app_auth
def song_detail(request, pk):
    return _resource_detail(request, "songs", pk)


@csrf_exempt
def songs_list(request):
    if request.method != "GET":
        return HttpResponseNotAllowed(["GET"])

    app_user = _get_optional_app_user(request)
    songs = Song.objects.filter(visibility="PUBLIC")
    if app_user:
        songs = Song.objects.filter(
            models.Q(visibility="PUBLIC") | models.Q(owner=app_user)
        )
    songs = songs.order_by("created_at")
    return JsonResponse(
        {
            "count": songs.count(),
            "songs": [
                {
                    "id": str(song.song_id),
                    "title": song.title,
                    "owner_id": str(song.owner_id),
                    "audio_url": song.audio_url,
                    "visibility": song.visibility,
                }
                for song in songs
            ],
        }
    )


@csrf_exempt
@_require_app_auth
def create_song(request):
    if request.method != "POST":
        return HttpResponseNotAllowed(["POST"])

    payload = _parse_json_body(request)
    if payload is None:
        return JsonResponse({"error": "Invalid JSON payload."}, status=400)

    payload["owner"] = str(request.app_user.user_id)

    form = SongForm(payload)
    if not form.is_valid():
        return _validation_error_response(form)

    song = form.save()
    return JsonResponse(_serialize_song_summary(song, "Created"), status=201)


@csrf_exempt
def get_song_detail(request, pk):
    if request.method != "GET":
        return HttpResponseNotAllowed(["GET"])

    app_user = _get_optional_app_user(request)
    song = get_object_or_404(Song, song_id=pk)
    if song.visibility == "PRIVATE" and (not app_user or song.owner_id != app_user.user_id):
        return JsonResponse({"error": "This private song is only visible to its owner."}, status=403)
    return JsonResponse(
        {
            "id": str(song.song_id),
            "title": song.title,
            "owner_id": str(song.owner_id),
            "audio_url": song.audio_url,
            "visibility": song.visibility,
            "created_at": song.created_at.isoformat(),
            "share_url": f"/share/{song.song_id}",
        }
    )


@csrf_exempt
def download_song(request, pk):
    if request.method != "GET":
        return HttpResponseNotAllowed(["GET"])

    app_user = _get_optional_app_user(request)
    song = get_object_or_404(Song.objects.select_related("produced_from_request"), song_id=pk)
    if song.visibility == "PRIVATE" and (not app_user or song.owner_id != app_user.user_id):
        return JsonResponse({"error": "This private song is only visible to its owner."}, status=403)

    strategy = (
        song.produced_from_request.generation_metadata.get("strategy")
        if getattr(song, "produced_from_request", None)
        else None
    )
    if strategy == "mock" or song.audio_url.startswith("/static/"):
        return _build_mock_audio_download(song.title)

    return redirect(song.audio_url)


@csrf_exempt
@_require_app_auth
def delete_song(request, pk):
    if request.method != "DELETE":
        return HttpResponseNotAllowed(["DELETE"])

    song = get_object_or_404(Song, song_id=pk, owner=request.app_user)
    song_id = str(song.song_id)
    song.delete()
    return JsonResponse({"message": "Deleted", "id": song_id})


@csrf_exempt
@_require_app_auth
def update_song_visibility(request, pk):
    if request.method not in ["PATCH", "PUT"]:
        return HttpResponseNotAllowed(["PATCH", "PUT"])

    payload = _parse_json_body(request)
    if payload is None:
        return JsonResponse({"error": "Invalid JSON payload."}, status=400)

    visibility = payload.get("visibility")
    valid_values = [choice for choice, _ in Song._meta.get_field("visibility").choices]
    if visibility not in valid_values:
        return JsonResponse(
            {
                "error": "Invalid visibility value.",
                "allowed_values": valid_values,
            },
            status=400,
        )

    song = get_object_or_404(Song, song_id=pk, owner=request.app_user)
    song.visibility = visibility
    song.save(update_fields=["visibility"])
    return JsonResponse(
        {
            "message": "Visibility updated",
            "id": str(song.song_id),
            "visibility": song.visibility,
        }
    )


@csrf_exempt
@_require_app_auth
def generation_requests_collection(request):
    return _resource_list_create(request, "requests")


@csrf_exempt
@_require_app_auth
def generation_request_detail(request, pk):
    return _resource_detail(request, "requests", pk)


@csrf_exempt
@_require_app_auth
def admin_actions_collection(request):
    return _resource_list_create(request, "admin-actions")


@csrf_exempt
@_require_app_auth
def admin_action_detail(request, pk):
    return _resource_detail(request, "admin-actions", pk)


@csrf_exempt
@_require_app_auth
def generate_song(request, pk):
    """
    POST /api/requests/<uuid:pk>/generate/

    Runs the configured generation strategy against the given MusicGenerationRequest
    and returns the newly created Song.
    """
    if request.method == "GET":
        generation_request = get_object_or_404(
            MusicGenerationRequest,
            request_id=pk,
            user=request.app_user,
        )
        return JsonResponse(_serialize_generation_status(generation_request))

    if request.method != "POST":
        return HttpResponseNotAllowed(["GET", "POST"])

    generation_request = get_object_or_404(
        MusicGenerationRequest,
        request_id=pk,
        user=request.app_user,
    )

    if generation_request.generation_status in {
        MusicGenerationRequest.GenerationStatus.QUEUED,
        MusicGenerationRequest.GenerationStatus.PROCESSING,
    }:
        return JsonResponse(
            {"error": "This request is already being processed."},
            status=409,
        )

    if generation_request.produced_song_id is not None:
        return JsonResponse(
            {"error": "This request has already been fulfilled."},
            status=409,
        )

    generation_request.generation_status = MusicGenerationRequest.GenerationStatus.QUEUED
    generation_request.progress_percent = 5
    generation_request.generation_error = ""
    generation_request.generation_id = ""
    generation_request.generation_metadata = {"progress_detail": "Queued for generation"}
    generation_request.started_at = timezone.now()
    generation_request.completed_at = None
    generation_request.save(
        update_fields=[
            "generation_status",
            "progress_percent",
            "generation_error",
            "generation_id",
            "generation_metadata",
            "started_at",
            "completed_at",
        ]
    )

    Thread(
        target=_run_generation_job,
        args=(generation_request.request_id,),
        daemon=True,
    ).start()

    return JsonResponse(
        {
            "message": "Song generation queued.",
            **_serialize_generation_status(generation_request),
        },
        status=202,
    )
