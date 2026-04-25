from django.db import models


class Visibility(models.TextChoices):
    PUBLIC = "PUBLIC", "PUBLIC"
    PRIVATE = "PRIVATE", "PRIVATE"
