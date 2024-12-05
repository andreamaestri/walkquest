from django.shortcuts import render
from .models import Walk

def home(request):
    walks = Walk.objects.all()
    context = {
        'walks': walks,
        'mapbox_token': settings.MAPBOX_TOKEN,
    }
    return render(request, 'pages/home.html', context)