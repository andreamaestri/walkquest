from tetra import Component
from .base import walks_lib
from walks.models import Walk

@walks_lib.register
class WalkList(Component):
    template = """
    <div x-data="{ walks: [] }" class="walk-list">
        <template x-for="walk in walks" :key="walk.id">
            <div class="walk-item" @click="$store.selectWalk(walk)">
                <h3 x-text="walk.title"></h3>
                <p x-text="walk.description"></p>
            </div>
        </template>
    </div>
    """

    def get_context_data(self):
        return {
            'walks': Walk.objects.all()
        }

    class Media:
        css = {
            'all': ['css/walk-list.css']
        }
