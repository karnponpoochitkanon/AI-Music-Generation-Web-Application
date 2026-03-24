from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .api import (
    AdminActionViewSet,
    AdminViewSet,
    MusicGenerationRequestViewSet,
    SongViewSet,
    UserViewSet,
)
from . import views

router = DefaultRouter()
router.register("users", UserViewSet, basename="drf-users")
router.register("admins", AdminViewSet, basename="drf-admins")
router.register("songs", SongViewSet, basename="drf-songs")
router.register("requests", MusicGenerationRequestViewSet, basename="drf-requests")
router.register("admin-actions", AdminActionViewSet, basename="drf-admin-actions")

urlpatterns = [
    path("", views.index, name="index"),
    path("api/drf/", include(router.urls)),
    path("songs/", views.songs_list, name="songs_list"),
    path("songs/create/", views.create_song, name="create_song"),
    path("songs/<uuid:pk>/", views.get_song_detail, name="get_song_detail"),
    path("songs/<uuid:pk>/delete/", views.delete_song, name="delete_song"),
    path(
        "songs/<uuid:pk>/visibility/",
        views.update_song_visibility,
        name="update_song_visibility",
    ),
    path("api/users/", views.users_collection, name="users_collection"),
    path("api/users/<uuid:pk>/", views.user_detail, name="user_detail"),
    path("api/admins/", views.admins_collection, name="admins_collection"),
    path("api/admins/<uuid:pk>/", views.admin_detail, name="admin_detail"),
    path("api/songs/", views.songs_collection, name="songs_collection"),
    path("api/songs/<uuid:pk>/", views.song_detail, name="song_detail"),
    path(
        "api/requests/",
        views.generation_requests_collection,
        name="generation_requests_collection",
    ),
    path(
        "api/requests/<uuid:pk>/",
        views.generation_request_detail,
        name="generation_request_detail",
    ),
    path(
        "api/admin-actions/",
        views.admin_actions_collection,
        name="admin_actions_collection",
    ),
    path(
        "api/admin-actions/<uuid:pk>/",
        views.admin_action_detail,
        name="admin_action_detail",
    ),
]
