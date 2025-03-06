from django.shortcuts import get_object_or_404
from ninja import NinjaAPI
from ninja import Router
from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated

from .models import Adventure
from .models import Companion
from .models import Walk
from .models import WalkCategoryTag
from .models import WalkFeatureTag
from .serializers import AdventureSerializer
from .serializers import CompanionSerializer
from .serializers import WalkCategoryTagSerializer
from .serializers import WalkFeatureTagSerializer
from .serializers import WalkSerializer


# Create the NinjaAPI instance - make sure this is defined before any other code uses it
api_instance = NinjaAPI()

# Create a Router
api = Router()

# Add the router to the API instance
api_instance.add_router("", api)
class CompanionViewSet(viewsets.ModelViewSet):
    """
    API endpoint that allows companions to be viewed or edited.
    """
    permission_classes = [IsAuthenticated]
    serializer_class = CompanionSerializer

    def get_queryset(self):
        """
        This view should return a list of all companions
        for the currently authenticated user.
        """
        return Companion.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

class WalkViewSet(viewsets.ModelViewSet):
    queryset = Walk.objects.all()
    serializer_class = WalkSerializer

class AdventureViewSet(viewsets.ModelViewSet):
    queryset = Adventure.objects.all()
    serializer_class = AdventureSerializer

class WalkCategoryTagViewSet(viewsets.ModelViewSet):
    queryset = WalkCategoryTag.objects.all()
    serializer_class = WalkCategoryTagSerializer

class WalkFeatureTagViewSet(viewsets.ModelViewSet):
    queryset = WalkFeatureTag.objects.all()
    serializer_class = WalkFeatureTagSerializer

# Basic walk endpoints
@api.get("/walks")
def list_walks(request):
    walks = Walk.objects.prefetch_related("features", "categories").all()
    return WalkSerializer(walks, many=True).data

@api.get("/walks/{walk_id}")
def get_walk(request, walk_id):
    walk = get_object_or_404(Walk, id=walk_id)
    return WalkSerializer(walk).data
