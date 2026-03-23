from django.contrib import admin
from .models import User, Admin, Song, MusicGenerationRequest, AdminAction

admin.site.register(User)
admin.site.register(Admin)
admin.site.register(Song)
admin.site.register(MusicGenerationRequest)
admin.site.register(AdminAction)