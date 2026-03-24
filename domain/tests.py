import json

from django.test import TestCase
from rest_framework.test import APIClient

from .models import Song, User


class PublicApiTests(TestCase):
    def setUp(self):
        self.api_client = APIClient()

    def test_homepage_renders(self):
        response = self.client.get("/")

        self.assertEqual(response.status_code, 302)
        self.assertEqual(response.headers["Location"], "/api/docs/")

    def test_user_crud_flow(self):
        create_response = self.client.post(
            "/api/users/",
            data=json.dumps(
                {
                    "email": "test@example.com",
                    "account_status": "ACTIVE",
                }
            ),
            content_type="application/json",
        )

        self.assertEqual(create_response.status_code, 201)
        user_id = create_response.json()["user_id"]

        detail_response = self.client.get(f"/api/users/{user_id}/")
        self.assertEqual(detail_response.status_code, 200)
        self.assertEqual(detail_response.json()["email"], "test@example.com")

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
        self.assertEqual(update_response.json()["account_status"], "RESTRICTED")

        delete_response = self.client.delete(f"/api/users/{user_id}/")
        self.assertEqual(delete_response.status_code, 204)
        self.assertFalse(User.objects.filter(user_id=user_id).exists())

    def test_postman_style_song_flow(self):
        owner = User.objects.create(
            email="owner@example.com",
            account_status="ACTIVE",
        )

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
