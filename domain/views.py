import json

from django.http import HttpResponseNotAllowed, JsonResponse
from django.shortcuts import get_object_or_404, redirect
from django.views.decorators.csrf import csrf_exempt

from .forms import (
    AdminActionForm,
    AdminForm,
    MusicGenerationRequestForm,
    SongForm,
    UserForm,
)
from .models import Admin, AdminAction, MusicGenerationRequest, Song, User


def index(request):
    return redirect("swagger-ui")


def _parse_json_body(request):
    if not request.body:
        return {}
    try:
        return json.loads(request.body)
    except json.JSONDecodeError:
        return None


def _validation_error_response(form):
    return JsonResponse({"errors": form.errors}, status=400)


def _serialize_user(obj):
    return {
        "user_id": str(obj.user_id),
        "email": obj.email,
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
    return {
        "song_id": str(obj.song_id),
        "title": obj.title,
        "owner_id": str(obj.owner_id),
        "audio_url": obj.audio_url,
        "visibility": obj.visibility,
        "created_at": obj.created_at.isoformat(),
    }


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
        data = [config["serializer"](obj) for obj in queryset]
        return JsonResponse({"count": len(data), "results": data})

    if request.method == "POST":
        payload = _parse_json_body(request)
        if payload is None:
            return JsonResponse({"error": "Invalid JSON payload."}, status=400)

        form = config["form"](payload)
        if not form.is_valid():
            return _validation_error_response(form)

        obj = form.save()
        return JsonResponse(config["serializer"](obj), status=201)

    return HttpResponseNotAllowed(["GET", "POST"])


def _resource_detail(request, resource_name, pk):
    config = RESOURCE_CONFIG[resource_name]
    obj = get_object_or_404(config["model"], **{config["lookup_field"]: pk})

    if request.method == "GET":
        return JsonResponse(config["serializer"](obj))

    if request.method == "PUT":
        payload = _parse_json_body(request)
        if payload is None:
            return JsonResponse({"error": "Invalid JSON payload."}, status=400)

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
def users_collection(request):
    return _resource_list_create(request, "users")


@csrf_exempt
def user_detail(request, pk):
    return _resource_detail(request, "users", pk)


@csrf_exempt
def admins_collection(request):
    return _resource_list_create(request, "admins")


@csrf_exempt
def admin_detail(request, pk):
    return _resource_detail(request, "admins", pk)


@csrf_exempt
def songs_collection(request):
    return _resource_list_create(request, "songs")


@csrf_exempt
def song_detail(request, pk):
    return _resource_detail(request, "songs", pk)


@csrf_exempt
def songs_list(request):
    if request.method != "GET":
        return HttpResponseNotAllowed(["GET"])

    songs = Song.objects.order_by("created_at")
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
def create_song(request):
    if request.method != "POST":
        return HttpResponseNotAllowed(["POST"])

    payload = _parse_json_body(request)
    if payload is None:
        return JsonResponse({"error": "Invalid JSON payload."}, status=400)

    form = SongForm(payload)
    if not form.is_valid():
        return _validation_error_response(form)

    song = form.save()
    return JsonResponse(_serialize_song_summary(song, "Created"), status=201)


@csrf_exempt
def get_song_detail(request, pk):
    if request.method != "GET":
        return HttpResponseNotAllowed(["GET"])

    song = get_object_or_404(Song, song_id=pk)
    return JsonResponse(
        {
            "id": str(song.song_id),
            "title": song.title,
            "owner_id": str(song.owner_id),
            "audio_url": song.audio_url,
            "visibility": song.visibility,
            "created_at": song.created_at.isoformat(),
        }
    )


@csrf_exempt
def delete_song(request, pk):
    if request.method != "DELETE":
        return HttpResponseNotAllowed(["DELETE"])

    song = get_object_or_404(Song, song_id=pk)
    song_id = str(song.song_id)
    song.delete()
    return JsonResponse({"message": "Deleted", "id": song_id})


@csrf_exempt
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

    song = get_object_or_404(Song, song_id=pk)
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
def generation_requests_collection(request):
    return _resource_list_create(request, "requests")


@csrf_exempt
def generation_request_detail(request, pk):
    return _resource_detail(request, "requests", pk)


@csrf_exempt
def admin_actions_collection(request):
    return _resource_list_create(request, "admin-actions")


@csrf_exempt
def admin_action_detail(request, pk):
    return _resource_detail(request, "admin-actions", pk)
