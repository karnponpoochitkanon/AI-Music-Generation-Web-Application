import json

from django.test import TestCase
from rest_framework.test import APIClient

from .models import MusicGenerationRequest, Song, User


class PublicApiTests(TestCase):
    def setUp(self):
        self.api_client = APIClient()

    def _set_auth_session(self, user):
        session = self.client.session
        session["auth_user"] = {"userId": str(user.user_id)}
        session.save()

    def test_homepage_renders(self):
        response = self.client.get("/")

        self.assertEqual(response.status_code, 302)
        self.assertEqual(response.headers["Location"], "/api/docs/")

    def test_user_crud_flow(self):
        existing_user = User.objects.create(
            email="owner-auth@example.com",
            account_status="ACTIVE",
        )
        self._set_auth_session(existing_user)
        user_id = str(existing_user.user_id)

        list_response = self.client.get("/api/users/")
        self.assertEqual(list_response.status_code, 200)
        self.assertEqual(list_response.json()["count"], 1)

        detail_response = self.client.get(f"/api/users/{user_id}/")
        self.assertEqual(detail_response.status_code, 200)
        self.assertEqual(detail_response.json()["email"], "owner-auth@example.com")

        update_response = self.client.put(
            f"/api/users/{user_id}/",
            data=json.dumps(
                {
                    "email": "updated@example.com",
                    "account_status": "RESTRICTED",
                }
            ),
            content_type="application/json",
        )
        self.assertEqual(update_response.status_code, 200)
        self.assertEqual(update_response.json()["email"], "owner-auth@example.com")
        self.assertEqual(update_response.json()["account_status"], "ACTIVE")

        delete_response = self.client.delete(f"/api/users/{user_id}/")
        self.assertEqual(delete_response.status_code, 204)
        self.assertFalse(User.objects.filter(user_id=user_id).exists())

    def test_postman_style_song_flow(self):
        owner = User.objects.create(
            email="owner@example.com",
            account_status="ACTIVE",
        )
        self._set_auth_session(owner)

        create_response = self.client.post(
            "/songs/create/",
            data=json.dumps(
                {
                    "title": "Zen Song",
                    "owner": str(owner.user_id),
                    "audio_url": "https://example.com/audio/zen-song.mp3",
                    "visibility": "PRIVATE",
                }
            ),
            content_type="application/json",
        )
        self.assertEqual(create_response.status_code, 201)
        self.assertEqual(create_response.json()["message"], "Created")
        song_id = create_response.json()["id"]

        list_response = self.client.get("/songs/")
        self.assertEqual(list_response.status_code, 200)
        self.assertEqual(list_response.json()["count"], 1)

        detail_response = self.client.get(f"/songs/{song_id}/")
        self.assertEqual(detail_response.status_code, 200)
        self.assertEqual(detail_response.json()["title"], "Zen Song")

        patch_response = self.client.patch(
            f"/songs/{song_id}/visibility/",
            data=json.dumps({"visibility": "PUBLIC"}),
            content_type="application/json",
        )
        self.assertEqual(patch_response.status_code, 200)
        self.assertEqual(patch_response.json()["visibility"], "PUBLIC")

        delete_response = self.client.delete(f"/songs/{song_id}/delete/")
        self.assertEqual(delete_response.status_code, 200)
        self.assertEqual(delete_response.json()["message"], "Deleted")
        self.assertFalse(Song.objects.filter(song_id=song_id).exists())

    def test_drf_docs_and_song_endpoint_render(self):
        docs_response = self.client.get("/api/docs/")
        self.assertEqual(docs_response.status_code, 200)

        owner = User.objects.create(
            email="drf-owner@example.com",
            account_status="ACTIVE",
        )
        create_response = self.api_client.post(
            "/api/drf/songs/",
            {
                "title": "Docs Song",
                "owner": str(owner.user_id),
                "audio_url": "https://example.com/audio/docs-song.mp3",
                "visibility": "PUBLIC",
            },
            format="json",
        )
        self.assertEqual(create_response.status_code, 201)
        self.assertEqual(create_response.data["title"], "Docs Song")

    def test_private_song_is_hidden_from_non_owner(self):
        owner = User.objects.create(email="private-owner@example.com", account_status="ACTIVE")
        song = Song.objects.create(
            title="Secret Track",
            owner=owner,
            audio_url="https://example.com/audio/private.mp3",
            visibility="PRIVATE",
        )

        detail_response = self.client.get(f"/songs/{song.song_id}/")
        self.assertEqual(detail_response.status_code, 403)

    def test_public_song_is_visible_without_login(self):
        owner = User.objects.create(email="public-owner@example.com", account_status="ACTIVE")
        song = Song.objects.create(
            title="Open Track",
            owner=owner,
            audio_url="https://example.com/audio/public.mp3",
            visibility="PUBLIC",
        )

        list_response = self.client.get("/songs/")
        self.assertEqual(list_response.status_code, 200)
        self.assertEqual(list_response.json()["count"], 1)

        detail_response = self.client.get(f"/songs/{song.song_id}/")
        self.assertEqual(detail_response.status_code, 200)
        self.assertEqual(detail_response.json()["visibility"], "PUBLIC")

    def test_owner_can_view_private_song_with_session(self):
        owner = User.objects.create(email="session-owner@example.com", account_status="ACTIVE")
        song = Song.objects.create(
            title="Owner Only",
            owner=owner,
            audio_url="https://example.com/audio/owner-only.mp3",
            visibility="PRIVATE",
        )
        self._set_auth_session(owner)

        detail_response = self.client.get(f"/songs/{song.song_id}/")
        self.assertEqual(detail_response.status_code, 200)
        self.assertEqual(detail_response.json()["title"], "Owner Only")

    def test_owner_library_includes_generation_parameters(self):
        owner = User.objects.create(email="library-owner@example.com", account_status="ACTIVE")
        song = Song.objects.create(
            title="Library Track",
            owner=owner,
            audio_url="https://example.com/audio/library.mp3",
            visibility="PRIVATE",
        )
        MusicGenerationRequest.objects.create(
            user=owner,
            song_name="Library Track",
            genre="ambient",
            mood="chill",
            singer_style="Soft vocal",
            description="Late-night tape texture",
            generation_status="COMPLETED",
            generation_id="gen_123",
            generation_metadata={"strategy": "mock"},
            produced_song=song,
        )
        self._set_auth_session(owner)

        response = self.client.get("/api/songs/")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["count"], 1)
        self.assertEqual(
            response.json()["results"][0]["generation_request"]["genre"],
            "ambient",
        )
        self.assertEqual(
            response.json()["results"][0]["generation_request"]["generation_id"],
            "gen_123",
        )

    def test_public_song_download_is_accessible_without_login(self):
        owner = User.objects.create(email="download-owner@example.com", account_status="ACTIVE")
        song = Song.objects.create(
            title="Shared Track",
            owner=owner,
            audio_url="/static/audio/mock_placeholder.mp3",
            visibility="PUBLIC",
        )
        MusicGenerationRequest.objects.create(
            user=owner,
            song_name="Shared Track",
            genre="lo-fi",
            mood="chill",
            generation_status="COMPLETED",
            generation_metadata={"strategy": "mock"},
            produced_song=song,
        )

        response = self.client.get(f"/songs/{song.song_id}/download/")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response["Content-Type"], "audio/wav")
        self.assertIn("attachment;", response["Content-Disposition"])

    def test_private_song_download_is_blocked_for_guest(self):
        owner = User.objects.create(email="private-download@example.com", account_status="ACTIVE")
        song = Song.objects.create(
            title="Locked Track",
            owner=owner,
            audio_url="/static/audio/mock_placeholder.mp3",
            visibility="PRIVATE",
        )

        response = self.client.get(f"/songs/{song.song_id}/download/")

        self.assertEqual(response.status_code, 403)
